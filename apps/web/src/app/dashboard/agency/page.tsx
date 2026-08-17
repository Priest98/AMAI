"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  CalendarClock,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Plug,
  Zap,
  UserCog,
} from 'lucide-react';
import { getPortfolio, Portfolio, PortfolioClient, HEALTH_META, healthColor, expiryLabel, getOrgMembers, OrgMember } from '@/lib/agency';
import { getBillingSummary, BillingSummary } from '@/lib/billing';
import { setActiveClientId } from '@/lib/api';

/**
 * Agency command centre. Answers, in order: how many clients, what needs
 * attention, what publishes today, who is waiting on approval, which
 * connections are broken.
 *
 * Every figure comes from the portfolio endpoint, which counts real rows.
 * Reach/engagement are deliberately absent because AMAI does not ingest
 * platform insights yet -- an empty portfolio shows honest zeros rather
 * than seeded numbers.
 */

function MetricTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone?: 'default' | 'warn';
}) {
  const accent = tone === 'warn' && value > 0 ? 'var(--accent-warning)' : 'var(--accent-secondary)';
  return (
    <div className="exec-card card-pad">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
        <span className="text-caption" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-h1 mt-2" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function ConnectionRow({ client }: { client: PortfolioClient }) {
  const problems = client.connections.filter((c) => c.health !== 'CONNECTED' && c.health !== 'UNKNOWN');
  if (problems.length === 0) return null;

  return (
    <>
      {problems.map((c) => {
        const meta = HEALTH_META[c.health];
        return (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            <div className="min-w-0">
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {client.name}
              </p>
              <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {c.platform}{c.accountName ? ` · ${c.accountName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-caption font-semibold" style={{ color: healthColor(meta.tone) }}>
                {expiryLabel(c) || meta.label}
              </span>
              <Link
                href="/dashboard/integrations"
                onClick={() => setActiveClientId(client.id)}
                className="btn-secondary px-3 py-2 rounded-[var(--radius-md)] text-caption font-bold touch-target"
              >
                Reconnect
              </Link>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPortfolio(), getBillingSummary()])
      .then(([p, b]) => { setPortfolio(p); setBilling(b); })
      .catch(() => setError("Couldn't load your portfolio. Try again."))
      .finally(() => setLoading(false));
  }, []);

  // Entitlement is enforced server-side; this only decides what to render.
  const hasAgency = billing?.entitlements?.clientManagement === true;

  const openClient = (id: string) => {
    setActiveClientId(id);
    router.push('/dashboard');
  };

  if (loading) {
    return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading portfolio…</div>;
  }

  if (error) {
    return (
      <div className="exec-card card-pad text-center">
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  if (billing && !hasAgency) {
    return (
      <div className="page-shell space-y-6">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Agency</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Manage multiple clients from one workspace.
          </p>
        </div>
        <div className="exec-card card-pad space-y-4">
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
            Client management is part of the Agency plan. Upgrade to add client workspaces, switch between them and
            see your whole portfolio in one place.
          </p>
          <Link
            href="/dashboard/settings?tab=billing"
            className="btn-primary-gradient inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold touch-target"
          >
            <Zap className="h-4 w-4" />
            <span>View plans</span>
          </Link>
        </div>
      </div>
    );
  }

  const p = portfolio!;
  const clientsNeedingAttention = p.clients.filter((c) => c.connectionIssueCount > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Agency</h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Your client portfolio at a glance.
          </p>
        </div>
        <Link
          href="/dashboard/clients"
          className="btn-secondary px-4 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold flex items-center gap-2 touch-target"
        >
          <Users className="h-4 w-4" />
          <span>All clients</span>
        </Link>
      </div>

      {/* 2 cols on mobile, 5 on desktop -- metrics stay readable at 320px
          rather than being squeezed into one row. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricTile icon={Users} label="Clients" value={p.clientCount} />
        <MetricTile icon={CalendarClock} label="Scheduled" value={p.totals.scheduled} />
        <MetricTile icon={CheckSquare} label="Awaiting approval" value={p.totals.awaitingApproval} tone="warn" />
        <MetricTile icon={Zap} label="Publishing today" value={p.totals.publishingToday} />
        <MetricTile icon={Plug} label="Connection issues" value={p.totals.connectionIssues} tone="warn" />
      </div>

      {/* Connection health first when something is wrong: it is the only
          thing here that silently breaks publishing if ignored. */}
      {clientsNeedingAttention.length > 0 && (
        <div className="exec-card card-pad">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-warning)' }} />
            <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Needs attention</h2>
          </div>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            These connections will stop scheduled posts from publishing if they lapse.
          </p>
          <div className="mt-3">
            {clientsNeedingAttention.map((c) => <ConnectionRow key={c.id} client={c} />)}
          </div>
        </div>
      )}

      <div className="exec-card card-pad">
        <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Clients</h2>

        {p.clients.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>No clients yet.</p>
            <Link
              href="/dashboard/clients"
              className="btn-primary-gradient inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-[var(--radius-md)] text-body-sm font-bold touch-target"
            >
              <span>Add your first client</span>
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {p.clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openClient(c.id)}
                className="surface-tile p-4 text-left transition-all duration-200 hover:opacity-95"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                    {c.industry && (
                      <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.industry}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.connections.length === 0 && (
                    <span className="text-caption" style={{ color: 'var(--text-muted)' }}>No accounts connected</span>
                  )}
                  {c.connections.map((conn) => {
                    const meta = HEALTH_META[conn.health];
                    return (
                      <span
                        key={conn.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-caption font-semibold"
                        style={{ backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-secondary)' }}
                        title={meta.label}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: healthColor(meta.tone) }} />
                        {conn.platform}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption" style={{ color: 'var(--text-secondary)' }}>
                  <span>{c.scheduledCount} scheduled</span>
                  <span>{c.awaitingApprovalCount} awaiting</span>
                  {c.connectionIssueCount > 0 && (
                    <span style={{ color: 'var(--accent-warning)' }}>
                      {c.connectionIssueCount} issue{c.connectionIssueCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <TeamSection />
    </div>
  );
}

/**
 * P1 agency team/roles foundation. Read-only for now -- the Role enum
 * (OWNER/ADMIN/MANAGER/CREATOR/EDITOR/CLIENT/VIEWER) and OrganizationMember
 * model already existed, used only inside guards and the maxTeamMembers
 * entitlement check; this is the first place that actually shows them to
 * the account owner. Invite/edit-role isn't built yet -- see
 * BrandsService.listMembers's doc comment.
 */
function TeamSection() {
  const [members, setMembers] = useState<OrgMember[] | null>(null);

  useEffect(() => {
    getOrgMembers().then(setMembers).catch(() => setMembers([]));
  }, []);

  if (!members || members.length === 0) return null;

  return (
    <div className="exec-card card-pad">
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>Team</h2>
      </div>
      <div className="mt-3 space-y-1.5">
        {members.map((m) => (
          <div key={m.membershipId} className="surface-tile p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
              <p className="text-caption truncate" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
            </div>
            <span
              className="text-caption font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--hover-surface)', color: 'var(--text-secondary)' }}
            >
              {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
