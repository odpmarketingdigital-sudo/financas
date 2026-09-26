"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { toReferenceMonth } from "@/lib/utils";

interface MonthContextValue {
  year: number;
  month: number;
  referenceMonth: string;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  setMonthYear: (year: number, month: number) => void;
}

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  function setMonthYear(nextYear: number, nextMonth: number) {
    setYear(nextYear);
    setMonth(nextMonth);
  }

  return (
    <MonthContext.Provider
      value={{
        year,
        month,
        referenceMonth: toReferenceMonth(year, month),
        setYear,
        setMonth,
        setMonthYear,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) {
    throw new Error("useMonth deve ser usado dentro de MonthProvider");
  }
  return ctx;
}
