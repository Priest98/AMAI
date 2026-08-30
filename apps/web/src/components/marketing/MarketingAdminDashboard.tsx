'use client';

import React, { useEffect, useState } from 'react';
import { Users, Trophy, TrendingUp, RefreshCw, Search, ExternalLink, ShieldCheck } from 'lucide-react';

export function MarketingAdminDashboard() {
  const [stats, setStats] = useState<any | null>(null);
  const [earlyAccessList, setEarlyAccessList] = useState<any[]>([]);
  const [creatorsList, setCreatorsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'early-access' | 'creators'>('overview');

  const [search, setSearch] = useState('');
  const [creatorStatusFilter, setCreatorStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/marketing/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  };

  const fetchEarlyAccess = async () => {
    try {
      const res = await fetch(`/api/marketing/admin/early-access?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setEarlyAccessList(data.items || []);
      }
    } catch {}
  };

  const fetchCreators = async () => {
    try {
      const res = await fetch(`/api/marketing/admin/creators?status=${encodeURIComponent(creatorStatusFilter)}`);
      if (res.ok) {
        const data = await res.json();
        setCreatorsList(data.items || []);
      }
    } catch {}
  };

  const updateCreatorStatus = async (id: string, newStatus: string, cohortRole?: string) => {
    try {
      const res = await fetch(`/api/marketing/admin/creators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, cohortRole }),
      });
      if (res.ok) {
        fetchCreators();
        fetchStats();
      }
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchEarlyAccess(), fetchCreators()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEarlyAccess();
  }, [search]);

  useEffect(() => {
    fetchCreators();
  }, [creatorStatusFilter]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center" style={{ color: 'var(--lp-cyan)' }}>
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: 'var(--lp-border)' }}>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
            <ShieldCheck className="w-4 h-4" />
            Founder Acquisition Dashboard
          </div>
          <h1 className="lp-heading text-3xl font-extrabold tracking-tight" style={{ color: 'var(--lp-text-primary)' }}>Oyinca Pre-Launch Analytics</h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--lp-text-secondary)' }}>
            Manage Early Access waitlist signups, referral metrics, and Founding Creator qualification.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-full" style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'overview' ? 'lp-btn-primary' : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('early-access')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'early-access' ? 'lp-btn-primary' : 'text-slate-400 hover:text-white'
            }`}
          >
            Early Access ({stats?.earlyAccess?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('creators')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'creators' ? 'lp-btn-primary' : 'text-slate-400 hover:text-white'
            }`}
          >
            Founding Creators ({stats?.foundingCreators?.totalApplications || 0})
          </button>
        </div>
      </div>

      {/* Target Tracker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="lp-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--lp-text-muted)' }}>
            Early Access Waitlist
            <Users className="w-4 h-4" style={{ color: 'var(--lp-cyan)' }} />
          </div>
          <div className="lp-heading text-3xl font-black mt-2" style={{ color: 'var(--lp-text-primary)' }}>{stats?.earlyAccess?.total || 0}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--lp-text-muted)' }}>Target: {stats?.earlyAccess?.targetRange || '100–500'} signups</div>
        </div>

        <div className="lp-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--lp-text-muted)' }}>
            Signups Today / Week
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="lp-heading text-3xl font-black text-emerald-400 mt-2">
            +{stats?.earlyAccess?.today || 0} <span className="text-xs font-normal" style={{ color: 'var(--lp-text-muted)' }}>/ +{stats?.earlyAccess?.thisWeek || 0}</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--lp-text-muted)' }}>New traffic velocity</div>
        </div>

        <div className="lp-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--lp-text-muted)' }}>
            Founding Creators Cohort
            <Trophy className="w-4 h-4" style={{ color: 'var(--lp-gold)' }} />
          </div>
          <div className="lp-heading text-3xl font-black mt-2" style={{ color: 'var(--lp-gold)' }}>
            {stats?.foundingCreators?.accepted || 0} <span className="text-xs font-normal" style={{ color: 'var(--lp-text-muted)' }}>/ 25</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--lp-text-muted)' }}>{stats?.foundingCreators?.underReview || 0} under review</div>
        </div>

        <div className="lp-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--lp-text-muted)' }}>
            Autopilot Testers
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--lp-cyan)' }} />
          </div>
          <div className="lp-heading text-3xl font-black mt-2" style={{ color: 'var(--lp-cyan)' }}>{stats?.foundingCreators?.accepted || 0}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--lp-text-muted)' }}>Target: 10–20 active testers</div>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recent Waitlist */}
          <div className="lp-card p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              Latest Early Access Signups
              <button onClick={() => setActiveTab('early-access')} className="text-xs hover:underline" style={{ color: 'var(--lp-cyan)' }}>
                View All →
              </button>
            </h3>

            <div className="space-y-3">
              {(stats?.earlyAccess?.recent || []).map((item: any) => (
                <div key={item.id} className="p-3.5 rounded-xl lp-glass flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      #{item.position} — {item.fullName}
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
                        @{item.tiktokUsername}
                      </span>
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--lp-text-muted)' }}>
                      {item.niche} • {item.followerRange} • {item.country}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold" style={{ color: 'var(--lp-gold)' }}>{item.referralCount} refs</div>
                    <div className="text-[10px]" style={{ color: 'var(--lp-text-muted)' }}>{new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Creator Applicants */}
          <div className="lp-card p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              Top Scoring Creator Applicants
              <button onClick={() => setActiveTab('creators')} className="text-xs hover:underline" style={{ color: 'var(--lp-cyan)' }}>
                View All →
              </button>
            </h3>

            <div className="space-y-3">
              {(stats?.foundingCreators?.recent || []).map((item: any) => (
                <div key={item.id} className="p-3.5 rounded-xl lp-glass flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {item.fullName}
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-300 bg-emerald-500/20">
                        Score: {item.internalScore}/100
                      </span>
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--lp-text-muted)' }}>
                      @{item.tiktokUsername} • {item.followerRange} • {item.niche}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase" style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EARLY ACCESS LIST TAB */}
      {activeTab === 'early-access' && (
        <div className="lp-card p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white">Early Access Directory</h3>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3" style={{ color: 'var(--lp-text-muted)' }} />
              <input
                type="text"
                placeholder="Search name, email, @handle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none"
                style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" style={{ color: 'var(--lp-text-secondary)' }}>
              <thead className="uppercase font-semibold text-[10px] tracking-wider border-b" style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}>
                <tr>
                  <th className="p-3">Pos</th>
                  <th className="p-3">Name & Email</th>
                  <th className="p-3">TikTok @</th>
                  <th className="p-3">Followers</th>
                  <th className="p-3">Niche</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Ref Code</th>
                  <th className="p-3">Refs</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--lp-border)' }}>
                {earlyAccessList.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-bold" style={{ color: 'var(--lp-cyan)' }}>#{item.position}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{item.fullName}</div>
                      <div className="text-[11px]" style={{ color: 'var(--lp-text-muted)' }}>{item.email}</div>
                    </td>
                    <td className="p-3 font-mono" style={{ color: 'var(--lp-cyan)' }}>@{item.tiktokUsername}</td>
                    <td className="p-3">{item.followerRange}</td>
                    <td className="p-3">{item.niche}</td>
                    <td className="p-3">{item.country}</td>
                    <td className="p-3 font-mono text-xs" style={{ color: 'var(--lp-text-muted)' }}>{item.referralCode}</td>
                    <td className="p-3 font-bold" style={{ color: 'var(--lp-gold)' }}>{item.referralCount}</td>
                    <td className="p-3" style={{ color: 'var(--lp-text-muted)' }}>{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATORS LIST TAB */}
      {activeTab === 'creators' && (
        <div className="lp-card p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white">Founding TikTok Creators Review Queue</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--lp-text-muted)' }}>Filter Status:</span>
              <select
                value={creatorStatusFilter}
                onChange={(e) => setCreatorStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs outline-none"
                style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
              >
                <option value="">All Outcomes</option>
                <option value="ACCEPTED">ACCEPTED (Cohort)</option>
                <option value="CREATOR_REVIEW">CREATOR_REVIEW</option>
                <option value="EARLY_ACCESS">EARLY_ACCESS</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" style={{ color: 'var(--lp-text-secondary)' }}>
              <thead className="uppercase font-semibold text-[10px] tracking-wider border-b" style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-text-muted)' }}>
                <tr>
                  <th className="p-3">Score</th>
                  <th className="p-3">Creator</th>
                  <th className="p-3">TikTok Handle</th>
                  <th className="p-3">Followers</th>
                  <th className="p-3">Niche</th>
                  <th className="p-3">Sample Videos</th>
                  <th className="p-3">7-Day Challenge</th>
                  <th className="p-3">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--lp-border)' }}>
                {creatorsList.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3">
                      <div className="text-sm font-black" style={{ color: 'var(--lp-gold)' }}>{item.internalScore}/100</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{item.fullName}</div>
                      <div className="text-[11px]" style={{ color: 'var(--lp-text-muted)' }}>{item.email}</div>
                    </td>
                    <td className="p-3">
                      <a
                        href={item.tiktokProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline font-mono inline-flex items-center gap-1"
                        style={{ color: 'var(--lp-cyan)' }}
                      >
                        @{item.tiktokUsername} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-3">{item.followerRange}</td>
                    <td className="p-3">{item.niche}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {(item.sampleVideoUrls || []).map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded text-[10px]"
                            style={{ background: 'var(--lp-cyan-soft)', color: 'var(--lp-cyan)' }}
                          >
                            Vid {idx + 1}
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] text-emerald-300 bg-emerald-500/20">
                        {item.willingAutopilotChallenge}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={item.status}
                        onChange={(e) => updateCreatorStatus(item.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold outline-none"
                        style={{ background: 'var(--lp-bg-soft)', border: '1px solid var(--lp-border)', color: 'var(--lp-text-primary)' }}
                      >
                        <option value="ACCEPTED">ACCEPTED (Cohort)</option>
                        <option value="CREATOR_REVIEW">CREATOR_REVIEW</option>
                        <option value="EARLY_ACCESS">EARLY_ACCESS</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
