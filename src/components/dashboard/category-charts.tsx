"use client";

import { useEffect, useState } from "react";
import { useMonth } from "@/contexts/month-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface CategoryDatum {
  name: string;
  value: number;
}

interface CategoryChartsData {
  expenses: CategoryDatum[];
  receivables: CategoryDatum[];
}

const NO_CATEGORY = "Sem categoria";

/** Paleta diversificada para identificar cada categoria. */
const CATEGORY_COLORS = [
  "#0d9488",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#10b981",
  "#ec4899",
  "#6366f1",
  "#f97316",
  "#06b6d4",
  "#a855f7",
  "#84cc16",
];

function colorFor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

/** Agrupa os lançamentos por categoria, somando os valores e ordenando do maior para o menor. */
function groupByCategory(
  rows: { category: string | null; value: number }[],
): CategoryDatum[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const name = row.category?.trim() || NO_CATEGORY;
    totals.set(name, (totals.get(name) ?? 0) + row.value);
  }

  return Array.from(totals, ([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

async function fetchCategoryChartsData(
  referenceMonth: string,
): Promise<CategoryChartsData> {
  const supabase = createClient();

  const [expensesRes, receivablesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("category, amount")
      .eq("reference_month", referenceMonth),
    supabase
      .from("receivables")
      .select("category, amount_due")
      .eq("reference_month", referenceMonth),
  ]);

  const expenses =
    (expensesRes.data as { category: string | null; amount: number }[]) ?? [];
  const receivables =
    (receivablesRes.data as {
      category: string | null;
      amount_due: number;
    }[]) ?? [];

  return {
    expenses: groupByCategory(
      expenses.map((expense) => ({
        category: expense.category,
        value: Number(expense.amount),
      })),
    ),
    receivables: groupByCategory(
      receivables.map((receivable) => ({
        category: receivable.category,
        value: Number(receivable.amount_due),
      })),
    ),
  };
}

interface CategoryPieCardProps {
  title: string;
  data: CategoryDatum[];
  emptyMessage: string;
}

function CategoryPieCard({ title, data, emptyMessage }: CategoryPieCardProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        {data.length > 0 && (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(total)}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <p className="mt-4 flex h-64 items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="78%"
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {data.map((item, index) => (
                  <Cell key={item.name} fill={colorFor(index)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function CategoryCharts() {
  const { referenceMonth } = useMonth();
  const [data, setData] = useState<CategoryChartsData>({
    expenses: [],
    receivables: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchCategoryChartsData(referenceMonth).then((next) => {
      if (cancelled) return;
      setData(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [referenceMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CategoryPieCard
        title="Despesas por Categoria"
        data={data.expenses}
        emptyMessage="Sem despesas registradas neste período."
      />
      <CategoryPieCard
        title="Recebíveis por Categoria"
        data={data.receivables}
        emptyMessage="Sem recebíveis registrados neste período."
      />
    </div>
  );
}
