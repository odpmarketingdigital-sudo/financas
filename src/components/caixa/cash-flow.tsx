"use client";

import { useEffect, useState } from "react";
import { useMonth } from "@/contexts/month-context";
import { createClient } from "@/lib/supabase/client";
import { recalculateAllBankAccountBalances } from "@/lib/bank-accounts";
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
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  PiggyBank,
} from "lucide-react";

interface CashFlowDay {
  /** Data no formato YYYY-MM-DD. */
  date: string;
  entries: number;
  exits: number;
  accumulated: number;
}

interface CashFlowData {
  days: CashFlowDay[];
  openingBalance: number;
  /** Soma atual de todas as contas/carteiras (`bank_accounts.balance`). */
  currentTotalBalance: number;
  totalEntries: number;
  totalExits: number;
}

const emptyData: CashFlowData = {
  days: [],
  openingBalance: 0,
  currentTotalBalance: 0,
  totalEntries: 0,
  totalExits: 0,
};

/** Linha de despesa paga usada no Fluxo de caixa (`status = 'paga'`). */
interface PaidExpenseRow {
  amount: number | string;
  due_date: string;
  payment_date: string | null;
}

/** Linha de entrada recebida usada no Fluxo de caixa (`status = 'recebido'`). */
interface ReceivedReceivableRow {
  amount_due: number | string;
  amount_paid: number | string;
  due_date: string;
  payment_date: string | null;
}

/** Linha de conta usada no saldo inicial (tolerante à migração do schema). */
interface OpeningAccountRow {
  balance: number | null;
  initial_balance?: number | null;
}

/** Arredonda para duas casas e evita ruído de ponto flutuante. */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Converte um valor monetário em número finito. Nulos, indefinidos ou strings
 * inválidas viram `0`, garantindo que tabelas vazias resultem em saldo `0` e
 * nunca em `NaN`.
 */
function toAmount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Data em que a movimentação afeta o caixa: a data de pagamento/recebimento
 * (`payment_date`) e, na ausência dela, a data de vencimento (`due_date`) —
 * usada para posicionar cada lançamento no dia correto do Fluxo de caixa.
 */
function cashDate(row: { due_date: string; payment_date: string | null }): string {
  return row.payment_date || row.due_date;
}

/**
 * Valor considerado para cada entrada: o valor efetivamente recebido
 * (`amount_paid`) quando houver, senão o previsto (`amount_due`) — mesma
 * convenção usada nos cartões de resumo da Visão geral.
 */
function receivableAmount(receivable: {
  amount_due: number | string;
  amount_paid: number | string;
}): number {
  const paid = toAmount(receivable.amount_paid);
  return paid > 0 ? paid : toAmount(receivable.amount_due);
}

/** Verde para valores positivos, vermelho para negativos e cinza para zero. */
function balanceTone(value: number): string {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-slate-500";
}

/**
 * Saldo inicial do mês selecionado:
 *
 *   Σ initial_balance (contas e carteiras)
 *   + entradas recebidas com data anterior ao dia 1 do mês
 *   − despesas pagas com data anterior ao dia 1 do mês
 *
 * Considera apenas o que já foi efetivado no caixa (despesas pagas e
 * entradas recebidas), posicionado pela data de pagamento/recebimento — ou
 * pelo vencimento quando `payment_date` não estiver preenchido.
 */
function computeOpeningBalance(
  referenceMonth: string,
  accounts: readonly OpeningAccountRow[],
  expenses: readonly PaidExpenseRow[],
  receivables: readonly ReceivedReceivableRow[],
): number {
  const { year, month } = parseReferenceMonth(referenceMonth);
  const monthStart = toDateKey(year, month, 1);

  const accountsBalance = accounts.reduce(
    (sum, account) => sum + toAmount(account.initial_balance ?? account.balance),
    0,
  );

  const receivedBefore = receivables.reduce(
    (sum, receivable) =>
      cashDate(receivable) < monthStart
        ? sum + receivableAmount(receivable)
        : sum,
    0,
  );

  const paidBefore = expenses.reduce(
    (sum, expense) =>
      cashDate(expense) < monthStart ? sum + toAmount(expense.amount) : sum,
    0,
  );

  return roundCurrency(accountsBalance + receivedBefore - paidBefore);
}

/**
 * Gera todos os dias do mês com entradas, saídas e saldos acumulados.
 *
 * Entram apenas os lançamentos efetivados no caixa — despesas pagas e
 * entradas recebidas — agrupados pela data de pagamento/recebimento. O saldo
 * é calculado sequencialmente: no dia 1 é `saldoInicial + entradas − saídas` e,
 * nos dias seguintes, o saldo acumulado anterior incorpora o resultado do dia.
 * No último dia o acumulado equivale a `saldoInicial + totalEntradas −
 * totalSaídas`.
 */
function buildCashFlow(
  referenceMonth: string,
  openingBalance: number,
  currentTotalBalance: number,
  expenses: readonly PaidExpenseRow[],
  receivables: readonly ReceivedReceivableRow[],
): CashFlowData {
  const { year, month } = parseReferenceMonth(referenceMonth);
  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = toDateKey(year, month, 1);
  const monthEnd = toDateKey(year, month, daysInMonth);

  const entriesByDay = new Map<string, number>();
  const exitsByDay = new Map<string, number>();

  for (const receivable of receivables) {
    const date = cashDate(receivable);
    if (date < monthStart || date > monthEnd) continue;
    entriesByDay.set(
      date,
      (entriesByDay.get(date) ?? 0) + receivableAmount(receivable),
    );
  }

  for (const expense of expenses) {
    const date = cashDate(expense);
    if (date < monthStart || date > monthEnd) continue;
    exitsByDay.set(
      date,
      (exitsByDay.get(date) ?? 0) + toAmount(expense.amount),
    );
  }

  const days: CashFlowDay[] = [];
  let accumulated = openingBalance;
  let totalEntries = 0;
  let totalExits = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = toDateKey(year, month, day);
    const entries = roundCurrency(entriesByDay.get(date) ?? 0);
    const exits = roundCurrency(exitsByDay.get(date) ?? 0);

    accumulated = roundCurrency(accumulated + entries - exits);
    totalEntries = roundCurrency(totalEntries + entries);
    totalExits = roundCurrency(totalExits + exits);

    days.push({ date, entries, exits, accumulated });
  }

  return { days, openingBalance, currentTotalBalance, totalEntries, totalExits };
}

export function CashFlow() {
  const { referenceMonth } = useMonth();
  const [data, setData] = useState<CashFlowData>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      // Recalcula primeiro para que os saldos lidos a seguir já reflitam o
      // saldo real (inicial + recebidos − pagos), como na Visão geral.
      await recalculateAllBankAccountBalances();

      // Apenas o que foi efetivado no caixa: despesas pagas e entradas
      // recebidas. Não filtramos por `reference_month` porque o Fluxo de caixa se
      // posiciona pela data de pagamento/recebimento — que pode ser diferente
      // do mês de referência — e o saldo inicial depende dos meses anteriores.
      const [expensesRes, receivablesRes, accountsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("amount, due_date, payment_date")
          .eq("status", "paga"),
        supabase
          .from("receivables")
          .select("amount_due, amount_paid, due_date, payment_date")
          .eq("status", "recebido"),
        // Saldo de abertura das contas (base do saldo inicial calculado).
        supabase.from("bank_accounts").select("balance, initial_balance"),
      ]);

      if (cancelled) return;

      const expenses = (expensesRes.data ?? []) as PaidExpenseRow[];
      const receivables = (receivablesRes.data ??
        []) as ReceivedReceivableRow[];
      const accounts = (accountsRes.data ?? []) as OpeningAccountRow[];

      const openingBalance = computeOpeningBalance(
        referenceMonth,
        accounts,
        expenses,
        receivables,
      );

      // Saldo atual total: soma dos saldos reais de todas as contas/carteiras.
      const currentTotalBalance = roundCurrency(
        accounts.reduce((sum, account) => sum + toAmount(account.balance), 0),
      );

      setData(
        buildCashFlow(
          referenceMonth,
          openingBalance,
          currentTotalBalance,
          expenses,
          receivables,
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
  const finalBalance =
    data.days.length > 0
      ? data.days[data.days.length - 1].accumulated
      : data.openingBalance;

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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Saldo Atual Total</CardTitle>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {formatCurrency(data.currentTotalBalance)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Soma atual de contas e carteiras
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
              <p className="mt-1 text-xs text-slate-400">
                Entradas recebidas
              </p>
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
              <p className="mt-1 text-xs text-slate-400">Despesas pagas</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Fluxo diário do mês */}
      <Card className="overflow-hidden p-0">
        <p className="border-b border-slate-100 px-4 py-3 text-xs text-slate-400 md:px-5">
          Todos os {data.days.length} dias de {monthLabel} · entradas e saídas
          agrupadas pela data de pagamento de cada lançamento (despesas pagas e
          entradas recebidas).
        </p>

        {/* Mobile: cards diários */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {data.days.map((day) => (
            <li key={day.date} className="space-y-3 p-4">
              <p className="font-medium text-slate-900">
                {formatDate(day.date)}
              </p>
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
        <div className="hidden md:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[25%]" />
              <col className="w-[25%]" />
              <col className="w-[25%]" />
            </colgroup>
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

