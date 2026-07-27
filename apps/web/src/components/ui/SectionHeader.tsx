import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, badge, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="section-header-title text-2xl font-semibold">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="section-header-subtitle text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
