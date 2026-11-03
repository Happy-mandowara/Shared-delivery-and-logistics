import React from "react";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`bg-white rounded-xl border border-neutral-200/90 shadow-xs p-5 md:p-6 transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  badge,
  action,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-100">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-neutral-600 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

