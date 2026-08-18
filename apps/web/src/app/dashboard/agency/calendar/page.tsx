"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { getAgencyCalendar, AgencyCalendarPost } from '@/lib/agency';
import AgencyUpgradePrompt from '@/components/dashboard/AgencyUpgradePrompt';

/**
 * Portfolio calendar: what is publishing across every client, grouped by
 * day. Deliberately a dense day-list rather than a month grid -- an agency
 * scanning 12 clients needs "what happens next", and a month grid with a
 * dozen overlapping client dots becomes unreadable well before it becomes
 * useful. Clients are filterable, and each row states which client it
 * belongs to, so context is never implied by colour alone.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AgencyCalendarPage() {
  const [posts, setPosts] = useState<AgencyCalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    getAgencyCalendar(30)
      .then((r) => setPosts(r.posts))
      .catch((err: any) => {
        if (err?.status === 403) {
          setNeedsUpgrade(true);
        } else {
          setError("Couldn't load the calendar. Try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const clients = useMemo(() => {
    const seen = new Map<string, string>();
    posts.forEach((p) => seen.set(p.clientId, p.clientName));
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [posts]);

  const toggle = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const byDay = useMemo(() => {
    const visible = posts.filter((p) => !hidden.has(p.clientId) && p.scheduledAt);
    const m = new Map<string, AgencyCalendarPost[]>();
    visible.forEach((p) => {
      const k = dayKey(new Date(p.scheduledAt!));
      const arr = m.get(k) || [];
      arr.push(p);
      m.set(k, arr);
    });
    return Array.from(m, ([key, items]) => ({ key, items })).sort((a, b) => a.key.localeCompare(b.key));
  }, [posts, hidden]);

  if (loading) return <div className="p-10 text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading calendar…</div>;
  if (needsUpgrade) {
    return (
      <AgencyUpgradePrompt
        title="All Calendar"
        description="Viewing what's publishing across every client is part of the Agency plan. Upgrade to see your whole portfolio's calendar in one place."
      />
    );
  }
  if (error) return <div className="exec-card card-pad text-center text-body-sm" style={{ color: 'var(--text-secondary)' }}>{error}</div>;

  const todayKey = dayKey(new Date());
  const tomorrowKey = dayKey(new Date(Date.now() + DAY_MS));

  const labelFor = (key: string) => {
    if (key === todayKey) return 'Today';
    if (key === tomorrowKey) return 'Tomorrow';
    return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Calendar</h1>
        <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Everything scheduled across your clients for the next 30 days.
        </p>
      </div>

      {clients.length > 1 && (
        <div className="exec-card card-pad">
          <p className="text-overline" style={{ color: 'var(--text-muted)' }}>Show clients</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {clients.map((c) => {
              const on = !hidden.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  aria-pressed={on}
                  className="px-3 py-2 rounded-full text-body-sm font-semibold touch-target"
                  style={{
                    backgroundColor: on ? 'var(--accent-secondary-subtle)' : 'var(--bg-surface-sunken)',
                    color: on ? 'var(--accent-secondary)' : 'var(--text-muted)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {byDay.length === 0 ? (
        <div className="exec-card card-pad text-center">
          <CalendarClock className="h-6 w-6 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>Nothing scheduled in this window.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byDay.map((d) => (
            <div key={d.key} className="exec-card card-pad">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-h3" style={{ color: 'var(--text-primary)' }}>{labelFor(d.key)}</h2>
                <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
                  {d.items.length} post{d.items.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {d.items
                  .sort((a, b) => (a.scheduledAt || '').localeCompare(b.scheduledAt || ''))
                  .map((p) => (
                    <div key={p.id} className="surface-tile p-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-body-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {p.scheduledAt ? new Date(p.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--'}
                      </span>
                      <span className="text-body-sm font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                        {p.clientName}
                      </span>
                      <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
                        {p.platforms.join(', ')}
                      </span>
                      <span className="text-body-sm truncate flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                        {p.caption || 'No caption'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
