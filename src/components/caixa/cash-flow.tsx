"use client";

import { useEffect, useState } from "react";
import { useMonth } from "@/contexts/month-context";
import { createClient } from "@/lib/supabase/client";
import {
  cn,
  formatCurrency,
  formatDate,
  getDaysInMonth,
  MONTH_NAMES,
  parseReferenceMonth,
  toDateKey,
} from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  PiggyBank,
  Scale,
} from "lucide-react";

interface CashFlowDay {
  /** Data no formato YYYY-MM-DD. */
  date: string;
  entries: number;
  exits: number;
  dayBalance: number;
  accumulated: number;
}

interface CashFlowData {
  days: CashFlowDay[];
  openingBalance: number;
  totalEntries: number;
  totalExits: number;
}

const emptyData: CashFlowData = {
  days: [],
  openingBalance: 0,
  totalEntries: 0,
  totalExits: 0,
};

/**
 * Valor considerado para cada recebível: o valor efetivamente recebido
 * (`amount_paid`) quando houver, senão o previsto (`amount_due`) — mesma
 * convenção usada nos cartões de resumo do Painel.
 */
function receivableAmount(receivable: {
  amount_due: number;
  amount_paid: number;
}): number {
  const paid = Number(receivable.amount_paid);
  return paid > 0 ? paid : Number(receivable.amount_due);
}

/** Verde para valores positivos, vermelho para negativos e cinza para zero. */
function balanceTone(value: number): string {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-slate-500";
}

function balanceBadgeVariant(value: number): "success" | "danger" | "neutral" {
  if (value > 0) return "success";
  if (value < 0) return "danger";
  return "neutral";
}

/** Gera todos os dias do mês com entradas, saídas e saldos acumulados. */
function buildCashFlow(
  referenceMonth: string,
  expenses: { amount: number; due_date: string }[],
  receivables: { amount_due: number; amount_paid: number; due_date: string }[],
  openingBalance: number,
): CashFlowData {
  const { year, month } = parseReferenceMonth(referenceMonth);

  const entriesByDay = new Map<string, number>();
  const exitsByDay = new Map<string, number>();

  for (const receivable of receivables) {
    entriesByDay.set(
      receivable.due_date,
      (entriesByDay.get(receivable.due_date) ?? 0) + receivableAmount(receivable),
    );
  }

  for (const expense of expenses) {
    exitsByDay.set(
      expense.due_date,
      (exitsByDay.get(expense.due_date) ?? 0) + Number(expense.amount),
    );
  }

  const days: CashFlowDay[] = [];
  let accumulated = openingBalance;
  let totalEntries = 0;
  let totalExits = 0;

  for (let day = 1; day <= getDaysInMonth(year, month); day += 1) {
    const date = toDateKey(year, month, day);
    const entries = entriesByDay.get(date) ?? 0;
    const exits = exitsByDay.get(date) ?? 0;
    const dayBalance = entries - exits;

    accumulated += dayBalance;
    totalEntries += entries;
    totalExits += exits;

    days.push({ date, entries, exits, dayBalance, accumulated });
  }

  return { days, openingBalance, totalEntries, totalExits };
}

export function CashFlow() {
  const { referenceMonth } = useMonth();
  const [data, setData] = useState<CashFlowData>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      const [expensesRes, receivablesRes, accountsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("amount, due_date")
          .eq("reference_month", referenceMonth),
        supabase
          .from("receivables")
          .select("amount_due, amount_paid, due_date")
          .eq("reference_month", referenceMonth),
        supabase.from("bank_accounts").select("balance"),
      ]);

      if (cancelled) return;

      const openingBalance = (accountsRes.data ?? []).reduce(
        (sum, account) => sum + Number(account.balance),
        0,
      );

      setData(
        buildCashFlow(
          referenceMonth,
          expensesRes.data ?? [],
          receivablesRes.data ?? [],
          openingBalance,
        ),
      );
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [referenceMonth]);

  const { year, month } = parseReferenceMonth(referenceMonth);
  const monthLabel = `${MONTH_NAMES[month - 1]} de ${year}`;
  const result = data.totalEntries - data.totalExits;
  const finalBalance = data.openingBalance + result;
  const resultNegative = result < 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo geral do mês */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Saldo inicial</CardTitle>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {formatCurrency(data.openingBalance)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Soma das contas e carteiras
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Total de entradas</CardTitle>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-600">
                {formatCurrency(data.totalEntries)}
              </p>
              <p className="mt-1 text-xs text-slate-400">Recebíveis do mês</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Total de saídas</CardTitle>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-rose-600">
                {formatCurrency(data.totalExits)}
              </p>
              <p className="mt-1 text-xs text-slate-400">Despesas do mês</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className={cn(resultNegative && "border-rose-200 bg-rose-50/40")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Resultado líquido do mês</CardTitle>
              <p
                className={cn(
                  "mt-2 text-2xl font-semibold tracking-tight",
                  resultNegative ? "text-rose-600" : "text-emerald-600",
                )}
              >
                {formatCurrency(result)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Entradas − saídas
              </p>
            </div>
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                resultNegative
                  ? "bg-rose-100 text-rose-600"
                  : "bg-teal-50 text-teal-700",
              )}
            >
              <Scale className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Fluxo diário do mês */}
      <Card className="overflow-hidden p-0">
        <p className="border-b border-slate-100 px-4 py-3 text-xs text-slate-400 md:px-5">
          Todos os {data.days.length} dias de {monthLabel} · entradas e saídas
          agrupadas pela data de vencimento de cada lançamento.
        </p>

        {/* Mobile: cards diários */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {data.days.map((day) => (
            <li key={day.date} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">
                  {formatDate(day.date)}
                </p>
                <Badge variant={balanceBadgeVariant(day.dayBalance)}>
                  {formatCurrency(day.dayBalance)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Entradas</p>
                  <p className="font-semibold tabular-nums text-emerald-600">
                    {formatCurrency(day.entries)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Saídas</p>
                  <p className="font-semibold tabular-nums text-rose-600">
                    {formatCurrency(day.exits)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">
                  Saldo acumulado
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    balanceTone(day.accumulated),
                  )}
                >
                  {formatCurrency(day.accumulated)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: tabela */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 text-right font-medium">
                  Entradas (R$)
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Saídas (R$)
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Saldo do dia
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Saldo acumulado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.days.map((day) => (
                <tr key={day.date} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatDate(day.date)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                    {formatCurrency(day.entries)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                    {formatCurrency(day.exits)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-medium tabular-nums",
                      balanceTone(day.dayBalance),
                    )}
                  >
                    {formatCurrency(day.dayBalance)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-semibold tabular-nums",
                      balanceTone(day.accumulated),
                    )}
                  >
                    {formatCurrency(day.accumulated)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50/80 font-semibold">
              <tr>
                <td className="px-4 py-3 text-slate-700">Resumo do mês</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                  {formatCurrency(data.totalEntries)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-rose-700">
                  {formatCurrency(data.totalExits)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums",
                    balanceTone(result),
                  )}
                >
                  {formatCurrency(result)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums",
                    balanceTone(finalBalance),
                  )}
                >
                  {formatCurrency(finalBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

