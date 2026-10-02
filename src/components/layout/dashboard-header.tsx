"use client";

import { MonthSelector } from "./month-selector";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  showMonthFilter?: boolean;
}

export function DashboardHeader({ title, description, showMonthFilter = true }: DashboardHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {showMonthFilter && (
        <div className="shrink-0">
          <MonthSelector />
        </div>
      )}
    </header>
  );
}
