"use client";

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';

/**
 * Shown wherever a Free/Pro account reaches an Agency-only (cross-client)
 * page/data fetch and the server correctly rejects it with a 403 (see
 * AgencyEntitlementGuard, apps/api/src/brands/agency-entitlement.guard.ts).
 * Kept as a single shared component so the copy/markup can't drift between
 * the Clients page and the three Agency subpages (Approvals/Calendar/
 * Analytics) that all hit the same class of endpoint.
 */
export default function AgencyUpgradePrompt({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>{title}</h1>
      </div>
      <div className="exec-card card-pad space-y-4">
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
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
