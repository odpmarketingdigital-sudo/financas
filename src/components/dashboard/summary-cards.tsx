"use client";

import { useEffect, useState } from "react";
import { useMonth } from "@/contexts/month-context";
import { createClient } from "@/lib/supabase/client";
import { recalculateAllBankAccountBalances } from "@/lib/bank-accounts";
import type { DashboardSummary } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CheckCircle2,
  Clock,
  Scale,
  TrendingUp,
  Wallet,
  Loader2,
} from "lucide-react";

const emptySummary: DashboardSummary = {
  saldoTotalAtual: 0,
  dinheiroEmMao: 0,
  saldoPrevisto: 0,
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

      // Garante que os cartões de saldo reflitam o saldo real calculado de
      // cada conta (inicial + recebidos − pagos) antes de somá-los.
      await recalculateAllBankAccountBalances();

      const [expensesRes, receivablesRes, bankAccountsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("amount, status")
          .eq("reference_month", referenceMonth),
        supabase
          .from("receivables")
          .select("amount_due, amount_paid, status")
          .eq("reference_month", referenceMonth),
        supabase.from("bank_accounts").select("balance, is_cash"),
      ]);

      if (cancelled) return;

      const expenses = expensesRes.data ?? [];
      const receivables = receivablesRes.data ?? [];
      const bankAccounts = bankAccountsRes.data ?? [];

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

      const saldoTotalAtual = bankAccounts.reduce(
        (sum, account) => sum + Number(account.balance),
        0,
      );

      const dinheiroEmMao = bankAccounts
        .filter((account) => account.is_cash)
        .reduce((sum, account) => sum + Number(account.balance), 0);

      setSummary({
        saldoTotalAtual,
        dinheiroEmMao,
        saldoPrevisto: saldoTotalAtual + totalAReceber - totalAPagar,
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
      hint: "Entradas em aberto",
      icon: ArrowDownCircle,
      accent: "text-sky-600 bg-sky-50",
    },
    {
      title: "Total Recebido",
      value: summary.totalRecebido,
      hint: "Entradas recebidas",
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
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const saldoPrevistoNegativo = summary.saldoPrevisto < 0;

  return (
    <div className="space-y-4">
      {/* Destaques: saldo atual das contas e projeção do mês */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Saldo Atual Total</CardTitle>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {formatCurrency(summary.saldoTotalAtual)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Saldo real calculado de bancos e carteiras
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Wallet className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
            <Banknote className="h-4 w-4 shrink-0 text-amber-700" />
            <span className="text-xs font-medium text-amber-700">
              Dinheiro em mão
            </span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-amber-800">
              {formatCurrency(summary.dinheiroEmMao)}
            </span>
          </div>
        </Card>

        <Card
          className={cn(saldoPrevistoNegativo && "border-rose-200 bg-rose-50/40")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Saldo Previsto</CardTitle>
              <p
                className={cn(
                  "mt-2 text-3xl font-semibold tracking-tight",
                  saldoPrevistoNegativo ? "text-rose-600" : "text-emerald-600",
                )}
              >
                {formatCurrency(summary.saldoPrevisto)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Saldo atual + a receber − a pagar no mês
              </p>
            </div>
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                saldoPrevistoNegativo
                  ? "bg-rose-100 text-rose-600"
                  : "bg-emerald-50 text-emerald-600",
              )}
            >
              {saldoPrevistoNegativo ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <TrendingUp className="h-5 w-5" />
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-sky-50 px-3 py-2">
              <p className="text-xs font-medium text-sky-700">A receber</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-sky-800">
                {formatCurrency(summary.totalAReceber)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-700">A pagar</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-amber-800">
                {formatCurrency(summary.totalAPagar)}
              </p>
            </div>
          </div>

          {saldoPrevistoNegativo && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Atenção: a projeção do mês fecha no negativo.
            </p>
          )}
        </Card>
      </div>

      {/* Demais indicadores do mês */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(({ title, value, hint, icon: Icon, accent }, index) => (
          <Card
            key={title}
            className={cn(
              "relative overflow-hidden",
              index < 3 ? "xl:col-span-2" : "xl:col-span-3",
              index === cards.length - 1 && "sm:col-span-2",
            )}
          >
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
    </div>
  );
}
