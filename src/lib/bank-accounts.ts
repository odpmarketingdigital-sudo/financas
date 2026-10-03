import { createClient } from "@/lib/supabase/client";
import type { AccountTransfer, BankAccount } from "@/lib/types";

/**
 * Contas bancárias e carteiras de dinheiro do usuário logado
 * (tabela `bank_accounts` no Supabase).
 *
 * A ordenação coloca as carteiras de dinheiro físico (`is_cash`) por último e
 * as demais em ordem alfabética — mesma convenção do cadastro de contas
 * (`src/components/bancos/banks-manager.tsx`).
 *
 * Este módulo também concentra o recálculo do saldo real de cada conta a
 * partir das movimentações de despesas e entradas
 * (`recalculateBankAccountBalances`).
 */
export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("bank_accounts")
    .select("*")
    .order("is_cash", { ascending: true })
    .order("name", { ascending: true });

  return (data as BankAccount[]) ?? [];
}

/**
 * Conta quantos registros o usuário tem em `bank_accounts`.
 * Usado como guarda rápida (FAB): evita falsas aberturas quando ainda não há
 * nenhuma conta cadastrada. Os gerenciadores usam a lista completa que já
 * carregam (`accounts.length === 0`) e revalidam antes de abrir.
 */
export async function hasBankAccounts(): Promise<boolean> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("bank_accounts")
    .select("id", { count: "exact", head: true });

  if (error) return false;
  return (count ?? 0) > 0;
}

/** Rótulo da conta no seletor: sinaliza as carteiras de dinheiro físico. */
export function bankAccountLabel(account: BankAccount): string {
  return account.is_cash ? `${account.name} (Dinheiro)` : account.name;
}

/** Gera as opções aceitas pelo componente `Select`. */
export function toBankAccountOptions(
  accounts: readonly BankAccount[],
): { value: string; label: string }[] {
  return accounts.map((account) => ({
    value: account.id,
    label: bankAccountLabel(account),
  }));
}

/** Nome da conta correspondente ao id — usado nas listagens. */
export function findBankAccountName(
  accounts: readonly BankAccount[],
  id: string | null,
): string | null {
  if (!id) return null;
  return accounts.find((account) => account.id === id)?.name ?? null;
}

/** Linha de conta usada no recálculo (tolerante à ausência de `initial_balance`). */
type AccountBalanceRow = Pick<BankAccount, "id" | "balance"> & {
  initial_balance?: number | null;
};

/** Linha de movimentação mínima usada no recálculo do saldo. */
type MovementRow = {
  bank_account_id: string | null;
  amount?: number | string | null;
  amount_due?: number | string | null;
  amount_paid?: number | string | null;
};

/** Linha de transferência mínima usada no recálculo do saldo. */
type TransferRow = {
  from_account_id: string | null;
  to_account_id: string | null;
  amount?: number | string | null;
};
/** Arredonda para duas casas e evita ruído de ponto flutuante. */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Valor considerado para uma entrada recebida: `amount_paid` quando houver
 * recebimento (parcial ou total), senão `amount_due` — mesma convenção dos
 * cartões da Visão geral e do fluxo de caixa.
 */
function receivedAmount(receivable: MovementRow): number {
  const paid = Number(receivable.amount_paid ?? 0);
  return paid > 0 ? paid : Number(receivable.amount_due ?? 0);
}

/**
 * Recalcula o saldo real (`bank_accounts.balance`) das contas informadas:
 *
 *   balance = initial_balance + entradas recebidas − despesas pagas
 *           + transferências recebidas − transferências enviadas
 *
 * - Despesas com status `paga` subtraem `amount`; entradas com status
 *   `recebido` somam `amount_paid` (ou `amount_due` quando não houver
 *   `amount_paid`).
 * - Transferências internas somam em `to_account_id` e subtraem em
 *   `from_account_id` — e NÃO entram em "Total Recebido"/"Total Pago".
 * - O recálculo ignora o mês de referência: o saldo da conta é acumulado.
 * - É idempotente, portanto pode rodar a cada movimentação e também na
 *   abertura das telas para corrigir eventuais divergências (ex.: exclusão de
 *   conta, troca de banco ou alteração de valor).
 * - Sem ids, recalcula todas as contas do usuário logado.
 */
export async function recalculateBankAccountBalances(
  accountIds?: readonly (string | null | undefined)[],
): Promise<void> {
  const ids = accountIds
    ? Array.from(
        new Set(accountIds.filter((id): id is string => Boolean(id))),
      )
    : null;

  if (ids && ids.length === 0) return;

  const supabase = createClient();

  const accountsQuery = supabase.from("bank_accounts").select("*");
  const expensesQuery = supabase
    .from("expenses")
    .select("bank_account_id, amount")
    .eq("status", "paga");
  const receivablesQuery = supabase
    .from("receivables")
    .select("bank_account_id, amount_due, amount_paid")
    .eq("status", "recebido");
  // Transferências internas: podem não existir em bases antigas (tabela criada
  // depois). A ausência da tabela é tolerada — saldos seguem sem o ajuste.
  const transfersQuery = supabase
    .from("account_transfers")
    .select("from_account_id, to_account_id, amount");

  const [accountsRes, expensesRes, receivablesRes, transfersRes] =
    await Promise.all([
      ids ? accountsQuery.in("id", ids) : accountsQuery,
      ids ? expensesQuery.in("bank_account_id", ids) : expensesQuery,
      ids ? receivablesQuery.in("bank_account_id", ids) : receivablesQuery,
      transfersQuery,
    ]);

  if (accountsRes.error || expensesRes.error || receivablesRes.error) return;

  const accounts = (accountsRes.data ?? []) as AccountBalanceRow[];
  if (accounts.length === 0) return;

  // Sem a migração do schema a coluna `initial_balance` não existe e não há
  // base confiável para recalcular: nada é gravado para não corromper saldos.
  if (!accounts.every((account) => "initial_balance" in account)) return;

  const paidByAccount = new Map<string, number>();
  for (const expense of (expensesRes.data ?? []) as MovementRow[]) {
    const accountId = expense.bank_account_id;
    if (!accountId) continue;
    paidByAccount.set(
      accountId,
      (paidByAccount.get(accountId) ?? 0) + Number(expense.amount ?? 0),
    );
  }

  const receivedByAccount = new Map<string, number>();
  for (const receivable of (receivablesRes.data ?? []) as MovementRow[]) {
    const accountId = receivable.bank_account_id;
    if (!accountId) continue;
    receivedByAccount.set(
      accountId,
      (receivedByAccount.get(accountId) ?? 0) + receivedAmount(receivable),
    );
  }

  const transferInByAccount = new Map<string, number>();
  const transferOutByAccount = new Map<string, number>();
  if (!transfersRes.error) {
    for (const transfer of ((transfersRes.data ?? []) as TransferRow[])) {
      const value = Number(transfer.amount ?? 0);
      if (!Number.isFinite(value) || value === 0) continue;
      if (transfer.to_account_id) {
        transferInByAccount.set(
          transfer.to_account_id,
          (transferInByAccount.get(transfer.to_account_id) ?? 0) + value,
        );
      }
      if (transfer.from_account_id) {
        transferOutByAccount.set(
          transfer.from_account_id,
          (transferOutByAccount.get(transfer.from_account_id) ?? 0) + value,
        );
      }
    }
  }

  await Promise.all(
    accounts.map((account) => {
      // Contas legadas sem `initial_balance` mantêm o saldo gravado como base.
      const base = Number(account.initial_balance ?? account.balance ?? 0);
      const next = roundCurrency(
        base +
          (receivedByAccount.get(account.id) ?? 0) -
          (paidByAccount.get(account.id) ?? 0) +
          (transferInByAccount.get(account.id) ?? 0) -
          (transferOutByAccount.get(account.id) ?? 0),
      );

      if (Math.abs(next - Number(account.balance)) < 0.005) {
        return Promise.resolve();
      }

      return supabase
        .from("bank_accounts")
        .update({ balance: next })
        .eq("id", account.id);
    }),
  );
}

/**
 * Recalcula o saldo real de todas as contas do usuário logado — usado ao
 * abrir a tela de Bancos e a Visão geral para exibir sempre o saldo calculado.
 */
export async function recalculateAllBankAccountBalances(): Promise<void> {
  await recalculateBankAccountBalances();
}

/**
 * Associa despesas e entradas antigas **sem conta** (`bank_account_id` nulo) à
 * primeira conta/carteira do usuário, na mesma ordem de `fetchBankAccounts`
 * (carteiras de dinheiro por último, demais em ordem alfabética).
 *
 * Serve para não quebrar os recálculos: `recalculateBankAccountBalances` ignora
 * lançamentos sem `bank_account_id`, então registros legados ficariam fora do
 * saldo real. É idempotente — só toca em registros ainda sem vínculo — e, sem
 * nenhuma conta cadastrada, não altera nada.
 *
 * Chamada ao abrir a Visão geral (Painel) e o Fluxo de caixa.
 */
export async function assignOrphanMovementsToFirstAccount(): Promise<void> {
  const accounts = await fetchBankAccounts();
  const target = accounts[0];
  if (!target) return;

  const supabase = createClient();
  await Promise.all([
    supabase
      .from("expenses")
      .update({ bank_account_id: target.id })
      .is("bank_account_id", null),
    supabase
      .from("receivables")
      .update({ bank_account_id: target.id })
      .is("bank_account_id", null),
  ]);
}

/**
 * Lista as transferências internas do usuário (mais recentes primeiro).
 * Retorna `[]` quando a tabela `account_transfers` ainda não existe
 * (base sem a migração) para não quebrar a tela de Bancos.
 */
export async function fetchAccountTransfers(): Promise<AccountTransfer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("account_transfers")
    .select("*")
    .order("transfer_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return (data as AccountTransfer[]) ?? [];
}

