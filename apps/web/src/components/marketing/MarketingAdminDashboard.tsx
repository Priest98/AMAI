'use client';

import React, { useEffect, useState } from 'react';
import { Users, Trophy, Sparkles, TrendingUp, Filter, RefreshCw, CheckCircle, Clock, Search, ExternalLink, ShieldCheck } from 'lucide-react';

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
      <div className="min-h-[400px] flex items-center justify-center text-purple-300">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8 text-white">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Founder Acquisition Dashboard
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Oyinca Pre-Launch Analytics</h1>
          <p className="text-slate-400 text-xs md:text-sm">
            Manage Early Access waitlist signups, referral metrics, and Founding Creator qualification.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'overview' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview & Targets
          </button>
          <button
            onClick={() => setActiveTab('early-access')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'early-access' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Early Access ({stats?.earlyAccess?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('creators')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'creators' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Founding Creators ({stats?.foundingCreators?.totalApplications || 0})
          </button>
        </div>
      </div>

      {/* Target Tracker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-purple-500/20">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            Early Access Waitlist
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white mt-2">{stats?.earlyAccess?.total || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Target: {stats?.earlyAccess?.targetRange || '100–500'} signups</div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-purple-500/20">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            Signups Today / Week
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-2">
            +{stats?.earlyAccess?.today || 0} <span className="text-slate-500 text-sm font-normal">/ +{stats?.earlyAccess?.thisWeek || 0}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">New traffic velocity</div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-purple-500/20">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            Founding Creators Cohort
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-300 mt-2">
            {stats?.foundingCreators?.accepted || 0} <span className="text-slate-500 text-sm font-normal">/ 25</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{stats?.foundingCreators?.underReview || 0} applications under review</div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-purple-500/20">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            7-Day Autopilot Testers
            <Sparkles className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-3xl font-black text-pink-400 mt-2">{stats?.foundingCreators?.accepted || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Target: 10–20 active testers</div>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recent Waitlist */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              Latest Early Access Signups
              <button onClick={() => setActiveTab('early-access')} className="text-xs text-purple-400 hover:underline">
                View All →
              </button>
            </h3>

            <div className="space-y-3">
              {(stats?.earlyAccess?.recent || []).map((item: any) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      #{item.position} — {item.fullName}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                        @{item.tiktokUsername}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.niche} • {item.followerRange} • {item.country}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-pink-400">{item.referralCount} refs</div>
                    <div className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Creator Applicants */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              Top Scoring Creator Applicants
              <button onClick={() => setActiveTab('creators')} className="text-xs text-purple-400 hover:underline">
                View All →
              </button>
            </h3>

            <div className="space-y-3">
              {(stats?.foundingCreators?.recent || []).map((item: any) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {item.fullName}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                        Score: {item.internalScore}/100
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      @{item.tiktokUsername} • {item.followerRange} • {item.niche}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      item.status === 'ACCEPTED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : item.status === 'CREATOR_REVIEW'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
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
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white">Early Access Waitlist Directory</h3>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search name, email, @handle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
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
              <tbody className="divide-y divide-slate-800/60">
                {earlyAccessList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-950/40">
                    <td className="p-3 font-bold text-purple-300">#{item.position}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{item.fullName}</div>
                      <div className="text-slate-500 text-[11px]">{item.email}</div>
                    </td>
                    <td className="p-3 font-mono text-purple-300">@{item.tiktokUsername}</td>
                    <td className="p-3">{item.followerRange}</td>
                    <td className="p-3">{item.niche}</td>
                    <td className="p-3">{item.country}</td>
                    <td className="p-3 font-mono text-xs text-slate-400">{item.referralCode}</td>
                    <td className="p-3 font-bold text-pink-400">{item.referralCount}</td>
                    <td className="p-3 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATORS LIST TAB */}
      {activeTab === 'creators' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white">Founding TikTok Creators Review Queue</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Status:</span>
              <select
                value={creatorStatusFilter}
                onChange={(e) => setCreatorStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
              >
                <option value="">All Outcomes</option>
                <option value="ACCEPTED">ACCEPTED (Cohort)</option>
                <option value="CREATOR_REVIEW">CREATOR_REVIEW</option>
                <option value="EARLY_ACCESS">EARLY_ACCESS</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Score</th>
                  <th className="p-3">Creator</th>
                  <th className="p-3">TikTok Handle & Link</th>
                  <th className="p-3">Follower Range</th>
                  <th className="p-3">Niche</th>
                  <th className="p-3">Sample Videos</th>
                  <th className="p-3">7-Day Challenge</th>
                  <th className="p-3">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {creatorsList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-950/40">
                    <td className="p-3">
                      <div className="text-sm font-black text-amber-300">{item.internalScore}/100</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{item.fullName}</div>
                      <div className="text-slate-500 text-[11px]">{item.email}</div>
                    </td>
                    <td className="p-3">
                      <a
                        href={item.tiktokProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-300 hover:underline inline-flex items-center gap-1 font-mono"
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
                            className="px-2 py-1 rounded bg-purple-950 border border-purple-500/30 text-[10px] text-purple-300 hover:bg-purple-900"
                          >
                            Vid {idx + 1}
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        {item.willingAutopilotChallenge}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={item.status}
                        onChange={(e) => updateCreatorStatus(item.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-semibold text-white outline-none"
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
