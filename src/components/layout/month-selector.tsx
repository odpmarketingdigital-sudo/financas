"use client";

import { useMonth } from "@/contexts/month-context";
import { MONTH_NAMES } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonthSelector() {
  const { year, month, setMonthYear } = useMonth();

  function goPrev() {
    if (month === 1) setMonthYear(year - 1, 12);
    else setMonthYear(year, month - 1);
  }

  function goNext() {
    if (month === 12) setMonthYear(year + 1, 1);
    else setMonthYear(year, month + 1);
  }

  function goCurrent() {
    const now = new Date();
    setMonthYear(now.getFullYear(), now.getMonth() + 1);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          aria-label="Mês anterior"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 px-1">
          <select
            aria-label="Mês"
            value={month}
            onChange={(e) => setMonthYear(year, Number(e.target.value))}
            className="h-8 rounded-md border-0 bg-transparent px-1 text-sm font-semibold text-slate-800 outline-none focus:ring-0"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Ano"
            value={year}
            onChange={(e) => setMonthYear(Number(e.target.value), month)}
            className="h-8 rounded-md border-0 bg-transparent px-1 text-sm font-semibold text-slate-800 outline-none focus:ring-0"
          >
            {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goNext}
          aria-label="Próximo mês"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button variant="outline" size="sm" onClick={goCurrent}>
        Mês atual
      </Button>
    </div>
  );
}
