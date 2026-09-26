"use client";

import { useEffect, useState } from "react";
import { useMonth } from "@/contexts/month-context";
import { createClient } from "@/lib/supabase/client";
import type { DashboardSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Scale,
  TrendingUp,
  Loader2,
} from "lucide-react";

const emptySummary: DashboardSummary = {
  totalAPagar: 0,
  totalPago: 0,
  totalAReceber: 0,
  totalRecebido: 0,
  resultadoLiquidoPrevisto: 0,
  resultadoLiquidoRealizado: 0,
};

export function SummaryCards() {
  const { referenceMonth } = useMonth();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      const [expensesRes, receivablesRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("amount, status")
          .eq("reference_month", referenceMonth),
        supabase
          .from("receivables")
          .select("amount_due, amount_paid, status")
          .eq("reference_month", referenceMonth),
      ]);

      if (cancelled) return;

      const expenses = expensesRes.data ?? [];
      const receivables = receivablesRes.data ?? [];

      const totalAPagar = expenses
        .filter((e) => e.status === "nao_paga")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const totalPago = expenses
        .filter((e) => e.status === "paga")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const totalAReceber = receivables
        .filter((r) => r.status === "a_receber")
        .reduce((sum, r) => sum + Number(r.amount_due), 0);

      const totalRecebido = receivables
        .filter((r) => r.status === "recebido")
        .reduce(
          (sum, r) =>
            sum + Number(r.amount_paid > 0 ? r.amount_paid : r.amount_due),
          0,
        );

      setSummary({
        totalAPagar,
        totalPago,
        totalAReceber,
        totalRecebido,
        resultadoLiquidoPrevisto:
          totalAReceber + totalRecebido - (totalAPagar + totalPago),
        resultadoLiquidoRealizado: totalRecebido - totalPago,
      });
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [referenceMonth]);

  const cards = [
    {
      title: "Total A Pagar",
      value: summary.totalAPagar,
      hint: "Despesas não pagas",
      icon: Clock,
      accent: "text-amber-600 bg-amber-50",
    },
    {
      title: "Total Pago",
      value: summary.totalPago,
      hint: "Despesas pagas",
      icon: CheckCircle2,
      accent: "text-rose-600 bg-rose-50",
    },
    {
      title: "Total A Receber",
      value: summary.totalAReceber,
      hint: "Recebíveis em aberto",
      icon: ArrowDownCircle,
      accent: "text-sky-600 bg-sky-50",
    },
    {
      title: "Total Recebido",
      value: summary.totalRecebido,
      hint: "Recebíveis quitados",
      icon: ArrowUpCircle,
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Resultado Líquido Previsto",
      value: summary.resultadoLiquidoPrevisto,
      hint: "(A Receber + Recebido) − (A Pagar + Pago)",
      icon: Scale,
      accent: "text-teal-700 bg-teal-50",
    },
    {
      title: "Resultado Líquido Realizado",
      value: summary.resultadoLiquidoRealizado,
      hint: "Recebido − Pago",
      icon: TrendingUp,
      accent: "text-indigo-600 bg-indigo-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ title, value, hint, icon: Icon, accent }) => (
        <Card key={title} className="relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              <p
                className={`mt-2 text-2xl font-semibold tracking-tight ${
                  value < 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {formatCurrency(value)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{hint}</p>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
