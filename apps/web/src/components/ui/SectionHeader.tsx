import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, badge, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
      <div className="flex items-center gap-2.5">
        <h1 className="section-header-title text-lg sm:text-xl font-bold tracking-tight">{title}</h1>
        {badge}
      </div>
      {action}
    </div>
  );
}
