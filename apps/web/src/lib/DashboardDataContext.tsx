"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { brandFetch } from './api';
import { getBillingSummary, type BillingSummary, type PlanEntitlements, type PlanTier, type SubscriptionStatus } from './billing';

export interface DashboardPostPreview {
  id: string;
  caption: string;
  status?: string;
  scheduledAt?: string | null;
  targets?: { platform: string }[];
}

export interface DashboardStats {
  needsApprovalCount: number;
  scheduledCount: number;
  publishedCount: number;
  failedCount: number;
  mediaCount: number;
  pendingPreview: DashboardPostPreview[];
}

export interface DashboardBootstrap {
  engine: { state: 'ACTIVE' | 'PAUSED'; approvalMode: 'MANUAL' | 'AUTO' };
  stats: DashboardStats;
  accounts: {
    socialAccounts: { platform: string; handle: string; status: string }[];
    googleDrive: { status?: string } | null;
  };
  billing: {
    plan: PlanTier;
    subscribedPlan: PlanTier;
    status: SubscriptionStatus;
    entitlements: PlanEntitlements;
  };
}

interface DashboardDataValue {
  bootstrap: DashboardBootstrap | null;
  bootstrapLoading: boolean;
  bootstrapError: boolean;
  billing: BillingSummary | null;
  refreshBootstrap: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataValue | null>(null);

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [bootstrap, setBootstrap] = useState<DashboardBootstrap | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState(false);
  const [billing, setBilling] = useState<BillingSummary | null>(null);

  const refreshBootstrap = useCallback(async () => {
    setBootstrapError(false);
    try {
      setBootstrap(await brandFetch<DashboardBootstrap>('/dashboard/bootstrap'));
    } catch {
      setBootstrapError(true);
    } finally {
      setBootstrapLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await brandFetch<DashboardStats>('/posts/stats');
      setBootstrap((current) => current ? { ...current, stats } : current);
    } catch {
      // Keep the last known dashboard state. A later event or manual retry
      // can reconcile it without taking down unrelated sections.
    }
  }, []);

  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    if (!bootstrap || billing) return;
    let active = true;
    // Full usage/storage billing is secondary. Start it only after the
    // useful dashboard bootstrap has successfully settled.
    void getBillingSummary().then((summary) => {
      if (active) setBilling(summary);
    }).catch(() => {});
    return () => { active = false; };
  }, [billing, bootstrap]);

  const value = useMemo(() => ({
    bootstrap,
    bootstrapLoading,
    bootstrapError,
    billing,
    refreshBootstrap,
    refreshStats,
  }), [bootstrap, bootstrapLoading, bootstrapError, billing, refreshBootstrap, refreshStats]);

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardDataValue {
  const value = useContext(DashboardDataContext);
  if (!value) throw new Error('useDashboardData must be used inside DashboardDataProvider');
  return value;
}
