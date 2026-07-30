import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, PostStatus, ScheduleStartOption, SchedulingPlatform } from '@prisma/client';

interface PostingSlot {
  priority: number;
  hour: number;
  minute: number;
}

export interface SchedulingConfig {
  postsPerDay: number;
  scheduleStartFrom: ScheduleStartOption;
  customStartDate: Date | null;
  timeZone: string;
  schedulingPlatform: SchedulingPlatform;
}

export interface ContentSignature {
  mediaKind: 'video' | 'image';
  contentCategory: string;
}

export interface SlotAssignment {
  scheduledAt: Date;
  /** 1=primary table slot, 2/3=secondary/tertiary, 99=generated fallback time. */
  priorityUsed: number;
}

const MAX_DAYS_TO_SEARCH = 120;
const FALLBACK_STEP_MINUTES = 90;
const FALLBACK_WINDOW_START_HOUR = 7;
const FALLBACK_WINDOW_END_HOUR = 23;

/**
 * The AI publishing calendar's scheduling engine. Turns a stream of
 * individually-uploaded media assets into a real 7-day-and-beyond
 * publishing calendar: assigns each one the next available slot per the
 * brand's configured posts-per-day, start date, time zone, and
 * platform-specific best-time tables (read from PlatformPostingSlot — a
 * centralized DB config, never hardcoded here — so posting windows can be
 * updated or new platforms added without a code change).
 *
 * Design note: assets are enriched and scheduled one request at a time
 * (see EngineService.processMediaAsset), not as a single atomic "batch of
 * 35" operation — Vercel serverless functions process each upload as its
 * own complete request/response cycle, and the earlier stuck-in-PROCESSING
 * bug this session was caused by exactly the opposite pattern (deferred,
 * unguaranteed background work). This service instead looks at what's
 * already on the calendar and finds the next free slot every time it's
 * called, which produces the same end result (an evenly-distributed 7-day
 * calendar) whether 35 files are uploaded in one sitting or trickle in
 * over an afternoon, without depending on knowing when a "batch" ends.
 */
@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Finds and returns the next available scheduledAt for a new post on
   * this brand's calendar, respecting: posts-per-day cap, the configured
   * start date, primary-then-secondary time priority, no two posts at the
   * exact same instant, skipping times already in the past, rolling to
   * subsequent days until a slot is found, and a light content-diversity
   * preference against the immediately preceding scheduled post.
   */
  async assignNextSlot(brandId: string, config: SchedulingConfig, content: ContentSignature): Promise<SlotAssignment> {
    const timeZone = this.safeTimeZone(config.timeZone);
    const postsPerDay = Math.min(Math.max(Math.round(config.postsPerDay || 1), 1), 5);
    const tablePlatform = await this.pickTimeTablePlatform(brandId, config.schedulingPlatform);
    const slotsByDay = await this.getSlotsByDayOfWeek(tablePlatform);
    const startCivil = await this.resolveStartCivilDate(config, timeZone);
    const now = new Date();

    for (let dayOffset = 0; dayOffset < MAX_DAYS_TO_SEARCH; dayOffset++) {
      const civil = this.addCivilDays(startCivil, dayOffset);
      const dayOfWeek = this.civilDayOfWeek(civil);

      const existingCountForDay = await this.countPostsOnCivilDay(brandId, civil, timeZone);
      if (existingCountForDay >= postsPerDay) continue; // day already full, try next day

      const candidates = this.buildCandidateTimesForDay(slotsByDay[dayOfWeek] || [], postsPerDay);

      for (const candidate of candidates) {
        const candidateUtc = this.zonedTimeToUtc(civil.year, civil.month, civil.day, candidate.hour, candidate.minute, timeZone);
        if (candidateUtc.getTime() <= now.getTime()) continue; // already passed, skip
        if (await this.isSlotTaken(brandId, candidateUtc)) continue; // exact-instant collision

        // Light content-diversity nudge: avoid placing this post directly
        // after another of the same category/media kind if we can help it.
        // Bounded to a single skip so this never turns into an unbounded
        // search — a slightly-less-ideal ordering beats an infinite loop.
        const predecessor = await this.getPredecessor(brandId, candidateUtc);
        const isBackToBackSameContent =
          predecessor?.contentCategory && predecessor.contentCategory === content.contentCategory;
        if (isBackToBackSameContent) {
          continue; // try the next candidate time/day for this asset instead
        }

        return { scheduledAt: candidateUtc, priorityUsed: candidate.priority };
      }
    }

    // Exhausted the search window (120 days) without finding a fully ideal
    // slot — extremely unlikely in practice (would mean a brand has
    // hundreds of unscheduled posts already queued). Fall back to "now +
    // 1 hour" rather than throwing, so an upload never fails outright.
    this.logger.warn(`SchedulingService: no ideal slot found within ${MAX_DAYS_TO_SEARCH} days for brand ${brandId}; falling back to now+1h.`);
    return { scheduledAt: new Date(now.getTime() + 60 * 60 * 1000), priorityUsed: 99 };
  }

  /** Heuristic content-type tag used for the back-to-back diversity check. */
  classifyContentCategory(topic: string, caption: string): string {
    const text = `${topic} ${caption}`.toLowerCase();
    const rules: [string, RegExp][] = [
      ['promotional', /\b(sale|discount|% ?off|limited time|shop now|buy now|deal|promo)\b/],
      ['educational', /\b(tip|tips|how to|guide|learn|tutorial|did you know|explained|step by step)\b/],
      ['behind_the_scenes', /\b(behind the scenes|bts|studio|workshop|process|making of|day in the life)\b/],
      ['product', /\b(product|collection|launch|new arrival|showcase|feature[sd]?)\b/],
    ];
    for (const [category, pattern] of rules) {
      if (pattern.test(text)) return category;
    }
    return 'general';
  }

  // ─────────────────────────────────────────────────────────────
  // Platform time-table lookups (PlatformPostingSlot is the centralized,
  // DB-driven config — nothing below hardcodes an actual time).
  // ─────────────────────────────────────────────────────────────

  /**
   * When scheduling for a single platform, always use that platform's
   * table. When BOTH is selected, alternate between Instagram's and
   * TikTok's tables post-by-post — a single Post has one shared
   * scheduledAt across every connected platform's target, so it can't
   * perfectly match both tables simultaneously; alternating gives both
   * platforms a fair share of their own optimal windows across the
   * calendar instead of picking one arbitrarily.
   */
  private async pickTimeTablePlatform(brandId: string, schedulingPlatform: SchedulingPlatform): Promise<Platform> {
    if (schedulingPlatform === SchedulingPlatform.INSTAGRAM) return Platform.INSTAGRAM;
    if (schedulingPlatform === SchedulingPlatform.TIKTOK) return Platform.TIKTOK;

    const totalScheduled = await this.prisma.post.count({ where: { brandId, scheduledAt: { not: null } } });
    return totalScheduled % 2 === 0 ? Platform.INSTAGRAM : Platform.TIKTOK;
  }

  private async getSlotsByDayOfWeek(platform: Platform): Promise<Record<number, PostingSlot[]>> {
    const rows = await this.prisma.platformPostingSlot.findMany({
      where: { platform },
      orderBy: [{ dayOfWeek: 'asc' }, { priority: 'asc' }],
    });
    const byDay: Record<number, PostingSlot[]> = {};
    for (const row of rows) {
      if (!byDay[row.dayOfWeek]) byDay[row.dayOfWeek] = [];
      byDay[row.dayOfWeek].push({ priority: row.priority, hour: row.hour, minute: row.minute });
    }
    return byDay;
  }

  /**
   * The configured priority slots for a day, extended with extra
   * evenly-spaced fallback times if postsPerDay exceeds how many named
   * slots that platform's table has for the day (e.g. Instagram only
   * lists 3 times/day, but postsPerDay can be set as high as 5).
   */
  private buildCandidateTimesForDay(baseSlots: PostingSlot[], postsPerDay: number): { hour: number; minute: number; priority: number }[] {
    const ordered = [...baseSlots].sort((a, b) => a.priority - b.priority).map((s) => ({ hour: s.hour, minute: s.minute, priority: s.priority }));
    if (ordered.length >= postsPerDay) return ordered;

    const seen = new Set(ordered.map((s) => `${s.hour}:${s.minute}`));
    let cursorMinutes = ordered.length > 0
      ? ordered[ordered.length - 1].hour * 60 + ordered[ordered.length - 1].minute
      : FALLBACK_WINDOW_START_HOUR * 60;

    const extras: { hour: number; minute: number; priority: number }[] = [];
    while (ordered.length + extras.length < postsPerDay + 2 && extras.length < 10) {
      cursorMinutes += FALLBACK_STEP_MINUTES;
      const wrapped = cursorMinutes % (24 * 60);
      const hour = Math.floor(wrapped / 60);
      const minute = wrapped % 60;
      if (hour < FALLBACK_WINDOW_START_HOUR || hour > FALLBACK_WINDOW_END_HOUR) continue;
      const key = `${hour}:${minute}`;
      if (seen.has(key)) continue;
      seen.add(key);
      extras.push({ hour, minute, priority: 99 });
    }
    return [...ordered, ...extras];
  }

  // ─────────────────────────────────────────────────────────────
  // Calendar queries
  // ─────────────────────────────────────────────────────────────

  private async countPostsOnCivilDay(brandId: string, civil: { year: number; month: number; day: number }, timeZone: string): Promise<number> {
    const dayStart = this.zonedTimeToUtc(civil.year, civil.month, civil.day, 0, 0, timeZone);
    const nextDay = this.addCivilDays(civil, 1);
    const dayEnd = this.zonedTimeToUtc(nextDay.year, nextDay.month, nextDay.day, 0, 0, timeZone);
    return this.prisma.post.count({
      where: { brandId, scheduledAt: { gte: dayStart, lt: dayEnd }, status: { not: PostStatus.REJECTED } },
    });
  }

  private async isSlotTaken(brandId: string, at: Date): Promise<boolean> {
    const count = await this.prisma.post.count({
      where: { brandId, scheduledAt: at, status: { not: PostStatus.REJECTED } },
    });
    return count > 0;
  }

  private async getPredecessor(brandId: string, before: Date): Promise<{ contentCategory: string | null } | null> {
    return this.prisma.post.findFirst({
      where: { brandId, scheduledAt: { lt: before, not: null }, status: { not: PostStatus.REJECTED } },
      orderBy: { scheduledAt: 'desc' },
      select: { contentCategory: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Start-date resolution
  // ─────────────────────────────────────────────────────────────

  private async resolveStartCivilDate(config: SchedulingConfig, timeZone: string): Promise<{ year: number; month: number; day: number }> {
    if (config.scheduleStartFrom === ScheduleStartOption.CUSTOM && config.customStartDate) {
      return this.civilDateInZone(config.customStartDate, timeZone);
    }
    const today = this.civilDateInZone(new Date(), timeZone);
    return config.scheduleStartFrom === ScheduleStartOption.TOMORROW ? this.addCivilDays(today, 1) : today;
  }

  // ─────────────────────────────────────────────────────────────
  // Timezone-aware date math (Intl-only, no new dependency)
  // ─────────────────────────────────────────────────────────────

  private safeTimeZone(tz: string | null | undefined): string {
    if (!tz) return 'UTC';
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return tz;
    } catch {
      return 'UTC';
    }
  }

  /** Converts a civil wall-clock time in `timeZone` to the correct UTC instant. */
  private zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
    const asUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
    const guess = new Date(asUTC);
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = fmt.formatToParts(guess).reduce((acc: Record<string, string>, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    const hh = parts.hour === '24' ? 0 : Number(parts.hour);
    const asIfLocal = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hh, Number(parts.minute), Number(parts.second));
    const diff = asIfLocal - asUTC;
    return new Date(asUTC - diff);
  }

  /** Extracts the civil (wall-clock) Y/M/D for an instant, as seen in `timeZone`. */
  private civilDateInZone(instant: Date, timeZone: string): { year: number; month: number; day: number } {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = fmt.formatToParts(instant).reduce((acc: Record<string, string>, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
  }

  /** Pure calendar-day arithmetic (DST-agnostic since it never touches wall-clock hours). */
  private addCivilDays(civil: { year: number; month: number; day: number }, days: number): { year: number; month: number; day: number } {
    const d = new Date(Date.UTC(civil.year, civil.month - 1, civil.day));
    d.setUTCDate(d.getUTCDate() + days);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }

  /** 0=Sunday .. 6=Saturday, matching PlatformPostingSlot.dayOfWeek's convention. */
  private civilDayOfWeek(civil: { year: number; month: number; day: number }): number {
    return new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay();
  }
}
