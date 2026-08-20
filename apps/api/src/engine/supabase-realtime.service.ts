import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable } from 'rxjs';

// These are Supabase's PUBLIC, publishable project keys (not secrets --
// same trust level as a Stripe publishable key: they're designed to be
// embedded in client bundles and rely on Row Level Security for
// protection, not secrecy). Safe to read here with a hardcoded fallback
// so this works without requiring a new Vercel env var round-trip; still
// overridable via env for rotation.
//
// IMPORTANT CONTEXT for whoever reads this next: this project currently
// has RLS disabled on every table (confirmed via Supabase advisors). That
// is a real, separate security gap -- flagged to the user -- but it does
// NOT make this specific usage unsafe, because this client only ever runs
// server-side inside the NestJS process (never shipped to the browser),
// and every consumer of watchEngineEvents() is called from an endpoint
// already gated by JwtAuthGuard + BrandAccessGuard, with the brandId
// filter applied at the Postgres replication level below.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rkgasmafgosubwfejzqu.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZ2FzbWFmZ29zdWJ3ZmVqenF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDgzNjIsImV4cCI6MjEwMDMyNDM2Mn0.FKpwoNxflMjoy5ua8Yd-kAwdqsqzeorYCpVzS8YTwhU';

export interface EngineEventRow {
  id: string;
  brandId: string;
  type: string;
  postId: string | null;
  mediaAssetId: string | null;
  message: string | null;
  createdAt: string;
}

/**
 * Replaces the old in-process EventEmitter2 broadcast for the AMAI Engine
 * activity stream. The previous design fired 'engine.activity' into
 * NestJS's local EventEmitter2, which only reaches listeners inside the
 * SAME running process -- fatal on Vercel, where the serverless function
 * instance holding a browser's long-lived SSE connection is routinely a
 * DIFFERENT instance than the one that later handles an approve/publish/
 * schedule request. That mismatch is the actual root cause of dashboard
 * updates taking anywhere from instant to ~10s (or never, until the user
 * navigated away and back): the emit was frequently firing into a process
 * nobody was listening to.
 *
 * Postgres itself (via Supabase's logical-replication-backed Realtime) is
 * the fix: every instance opens its OWN subscription directly against the
 * database -- the actual source of truth -- instead of relying on another
 * instance's in-memory state reaching it. Since every write that used to
 * emit('engine.activity', X) already does `prisma.engineEvent.create(X)`
 * first (confirmed: zero DB-less/ephemeral emits exist in this codebase),
 * subscribing to INSERTs on EngineEvent captures 100% of what the old
 * transport carried, with no loss of the Approval Queue's live "AMAI
 * Engine running…" progress panel or any other consumer.
 */
@Injectable()
export class SupabaseRealtimeService {
  private readonly logger = new Logger(SupabaseRealtimeService.name);
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.client) {
      // Explicit `<any>` generic: without it, TS tries to structurally infer
      // supabase-js's full (Database-schema-aware) client type from this
      // call site, which -- with the @supabase/supabase-js version this
      // project resolves to -- blows past TypeScript's type-instantiation
      // depth limit (TS2589) and fails the build entirely. This project
      // never passes a typed `Database` schema generic to begin with, so
      // there's no type-safety being given up here that existed before.
      this.client = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: { params: { eventsPerSecond: 10 } },
      });
    }
    return this.client;
  }

  /**
   * One Postgres Realtime subscription per SSE connection, filtered at the
   * replication level to this brand's rows only (`filter: brandId=eq.…`)
   * so a busy brand elsewhere never triggers wakeups here. Teardown
   * (unsubscribe + removeChannel) runs whenever the returned Observable is
   * unsubscribed -- i.e. on every SSE reconnect cycle (~50s, see
   * EngineController) and on real client disconnects -- so this can never
   * leak channels across the repeated reconnects a long dashboard session
   * produces.
   */
  watchEngineEvents(brandId: string): Observable<EngineEventRow> {
    return new Observable<EngineEventRow>((subscriber) => {
      const client = this.getClient();
      const channel = client
        .channel(`engine-events-${brandId}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'EngineEvent', filter: `brandId=eq.${brandId}` },
          (payload: { new: EngineEventRow }) => {
            subscriber.next(payload.new);
          },
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.logger.warn(`Realtime channel for brand ${brandId} hit status=${status}: ${err?.message || 'no error detail'}`);
          }
        });

      return () => {
        client.removeChannel(channel).catch((error: any) => {
          this.logger.warn(`Failed to cleanly remove Realtime channel for brand ${brandId}: ${error?.message || error}`);
        });
      };
    });
  }
}
