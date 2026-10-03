"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BANK_OPTIONS,
  OTHER_BANK_ID,
  type BankOption,
} from "@/constants/banks";
import {
  filterBankOptions,
  findBankOptionByName,
  mergeBankOptions,
  toBankComboboxOptions,
  toBankOption,
} from "@/lib/banks";
import { fetchBanks } from "@/services/brasilApi";
import {
  fetchAccountTransfers,
  fetchBankAccounts,
  findBankAccountName,
  recalculateAllBankAccountBalances,
  recalculateBankAccountBalances,
} from "@/lib/bank-accounts";
import type { AccountTransfer, BankAccount } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TransferModal } from "@/components/bancos/transfer-modal";
import {
  ArrowLeftRight,
  Banknote,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

interface BankAccountFormState {
  /** Id do banco selecionado no seletor (`""` = nenhum). */
  bankId: string;
  /** Nome gravado em `bank_accounts.name` (preenchido pelo seletor). */
  name: string;
  /** Saldo de abertura gravado em `bank_accounts.initial_balance`. */
  initialBalance: string;
  is_cash: boolean;
}

const emptyForm: BankAccountFormState = {
  bankId: "",
  name: "",
  initialBalance: "",
  is_cash: false,
};

/** Selo da conta: cor/sigla da marca quando o banco é reconhecido. */
function AccountBrand({ account }: { account: BankAccount }) {
  if (account.is_cash) {
    return <Banknote className="h-4 w-4 shrink-0 text-slate-400" />;
  }

  const option = findBankOptionByName(account.name);
  if (option && option.kind === "bank") {
    return (
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold uppercase"
        style={{ backgroundColor: option.color, color: option.foreground }}
      >
        {option.initials}
      </span>
    );
  }

  return <Landmark className="h-4 w-4 shrink-0 text-slate-400" />;
}

export function BanksManager() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [needsTwoAccountsOpen, setNeedsTwoAccountsOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<BankAccountFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [remoteBanks, setRemoteBanks] = useState<BankOption[]>([]);
  const [remoteQuery, setRemoteQuery] = useState("");
  const [searchingBanks, setSearchingBanks] = useState(false);
  const searchSequence = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Recalcula o saldo real antes de exibir: cobre movimentações feitas em
      // outros dispositivos e eventuais divergências acumuladas.
      await recalculateAllBankAccountBalances();
      const [next, nextTransfers] = await Promise.all([
        fetchBankAccounts(),
        fetchAccountTransfers(),
      ]);

      if (cancelled) return;
      setAccounts(next);
      setTransfers(nextTransfers);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /** Lista completa disponível: padrão + bancos encontrados na BrasilAPI. */
  const allBankOptions = useMemo(
    () => mergeBankOptions(BANK_OPTIONS, remoteBanks),
    [remoteBanks],
  );

  const selectedBank =
    allBankOptions.find((option) => option.id === form.bankId) ?? null;
  const isCashSelected = selectedBank?.kind === "cash";
  const isCustomSelected = selectedBank?.kind === "custom";
  /** "Dinheiro em mãos" é fixo e nenhuma opção libera o nome sem banco. */
  const nameLocked = !selectedBank || isCashSelected;

  /** Opções do combobox: lista padrão + resultados online da busca atual. */
  const comboboxOptions = useMemo(() => {
    const matchedRemote = remoteQuery
      ? filterBankOptions(remoteBanks, remoteQuery).slice(0, 40)
      : [];
    const options = [...BANK_OPTIONS, ...matchedRemote];
    return toBankComboboxOptions(
      mergeBankOptions(options, selectedBank ? [selectedBank] : []),
    );
  }, [remoteBanks, remoteQuery, selectedBank]);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(account: BankAccount) {
    const option = findBankOptionByName(account.name);

    setEditing(account);
    setForm({
      // Contas antigas com nome livre entram como "Outro Banco".
      bankId: option?.id ?? OTHER_BANK_ID,
      name: account.name,
      // Contas anteriores à migração guardam o saldo em `balance`.
      initialBalance: String(account.initial_balance ?? account.balance ?? ""),
      is_cash: account.is_cash || option?.kind === "cash",
    });
    setError(null);
    setModalOpen(true);
  }

  /** Aplica o banco escolhido preenchendo (ou liberando) o nome da conta. */
  function handleBankChange(bankId: string) {
    setForm((current) => {
      const option =
        allBankOptions.find((item) => item.id === bankId) ?? null;

      if (!option) {
        return { ...current, bankId: "", name: "", is_cash: false };
      }

      // A marcação de dinheiro físico/espécie vem da própria opção escolhida
      // no seletor ("Dinheiro em mãos" → `kind: "cash"`).
      const is_cash = option.kind === "cash";

      if (option.kind === "custom") {
        // Nome digitado manualmente pelo usuário.
        return { ...current, bankId: option.id, name: "", is_cash };
      }

      return { ...current, bankId: option.id, name: option.name, is_cash };
    });
  }

  /**
   * Complementa a busca com a lista completa do Banco Central quando nenhum
   * banco da lista padrão corresponde ao termo digitado.
   */
  async function handleBankSearch(term: string) {
    const trimmed = term.trim();
    const localMatches = filterBankOptions(BANK_OPTIONS, trimmed).length > 0;

    if (trimmed.length < 3 || localMatches) {
      setRemoteQuery("");
      return;
    }

    setRemoteQuery(trimmed);

    // A lista completa já está em memória (cache do serviço).
    if (remoteBanks.length > 0) return;

    const sequence = searchSequence.current + 1;
    searchSequence.current = sequence;
    setSearchingBanks(true);

    try {
      const banks = await fetchBanks();
      if (searchSequence.current !== sequence) return;
      setRemoteBanks(banks.map(toBankOption));
    } catch {
      // A busca online é um complemento: falhas não bloqueiam o cadastro.
    } finally {
      if (searchSequence.current === sequence) setSearchingBanks(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();

    if (!selectedBank) {
      setError("Selecione um banco ou carteira na lista.");
      return;
    }

    if (!name) {
      setError("Informe o nome da conta.");
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sessão expirada. Faça login novamente.");
      setSaving(false);
      return;
    }

    const initialBalance = Number(form.initialBalance || 0);

    const payload = {
      name,
      initial_balance: initialBalance,
      is_cash: form.is_cash,
      user_id: user.id,
    };

    // `select("id")` devolve a conta gravada para recalcular o saldo real.
    const result = editing
      ? await supabase
          .from("bank_accounts")
          .update(payload)
          .eq("id", editing.id)
          .select("id")
          .single()
      : await supabase
          .from("bank_accounts")
          .insert({ ...payload, balance: initialBalance })
          .select("id")
          .single();

    if (result.error) {
      setSaving(false);
      setError(result.error.message);
      return;
    }

    // Reajusta o saldo real (saldo inicial + recebidos − pagos) da conta.
    await recalculateBankAccountBalances([
      result.data?.id ?? editing?.id ?? null,
    ]);

    setSaving(false);
    setModalOpen(false);
    refresh();
  }

  async function handleDelete(account: BankAccount) {
    if (!confirm(`Excluir "${account.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    const supabase = createClient();
    await supabase.from("bank_accounts").delete().eq("id", account.id);
    refresh();
  }

  function openTransfer() {
    if (accounts.length < 2) {
      setNeedsTwoAccountsOpen(true);
      return;
    }
    setTransferOpen(true);
  }

  async function handleDeleteTransfer(transfer: AccountTransfer) {
    if (
      !confirm(
        `Excluir transferência de ${formatCurrency(Number(transfer.amount))}? Os saldos das contas serão recalculados.`,
      )
    ) {
      return;
    }
    const supabase = createClient();
    await supabase.from("account_transfers").delete().eq("id", transfer.id);
    // Recalcula imediatamente o saldo das duas contas envolvidas.
    await recalculateBankAccountBalances([
      transfer.from_account_id,
      transfer.to_account_id,
    ]);
    refresh();
  }

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance),
    0,
  );
  const cashBalance = accounts
    .filter((account) => account.is_cash)
    .reduce((sum, account) => sum + Number(account.balance), 0);
  const bankBalance = totalBalance - cashBalance;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={openTransfer}>
          <ArrowLeftRight className="h-4 w-4" />
          Transferir
        </Button>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova conta
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <CardTitle>Saldo total</CardTitle>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            {formatCurrency(totalBalance)}
          </p>
        </Card>
        <Card className="p-4">
          <CardTitle>Em bancos</CardTitle>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            {formatCurrency(bankBalance)}
          </p>
        </Card>
        <Card className="p-4">
          <CardTitle>Dinheiro físico</CardTitle>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            {formatCurrency(cashBalance)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            Nenhum banco ou carteira cadastrado ainda. Cadastre o primeiro!
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {accounts.map((account) => (
                <li key={account.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <AccountBrand account={account} />
                      <p className="truncate font-medium text-slate-900">
                        {account.name}
                      </p>
                    </div>
                    <Badge variant={account.is_cash ? "warning" : "neutral"}>
                      {account.is_cash ? "Dinheiro físico" : "Banco"}
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Saldo</p>
                      <p className="font-semibold tabular-nums text-slate-900">
                        {formatCurrency(Number(account.balance))}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(account)}
                        aria-label={`Editar ${account.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleDelete(account)}
                        aria-label={`Excluir ${account.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Conta</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AccountBrand account={account} />
                          <span className="font-medium text-slate-900">
                            {account.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={account.is_cash ? "warning" : "neutral"}>
                          {account.is_cash ? "Dinheiro físico" : "Banco"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-900">
                        {formatCurrency(Number(account.balance))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(account)}
                            aria-label={`Editar ${account.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDelete(account)}
                            aria-label={`Excluir ${account.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar conta" : "Nova conta"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Combobox
            id="bank_option"
            label="Banco / carteira"
            options={comboboxOptions}
            value={form.bankId}
            onChange={handleBankChange}
            onSearchChange={handleBankSearch}
            loading={searchingBanks}
            placeholder="Selecione um banco ou carteira"
            searchPlaceholder="Buscar banco (ex.: Nubank, Sicoob...)"
            emptyMessage="Nenhum banco encontrado. Escolha “Outro Banco” para digitar o nome."
            hint="Principais bancos do Brasil. Digite o nome para buscar outros bancos online."
          />
          <Input
            id="bank_name"
            label="Nome da conta"
            required
            disabled={nameLocked}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={
              isCustomSelected
                ? "Digite o nome do banco ou carteira"
                : "Preenchido ao selecionar um banco"
            }
            className={nameLocked ? "cursor-not-allowed bg-slate-50 text-slate-500" : undefined}
          />
          <Input
            id="bank_initial_balance"
            label="Saldo inicial (R$)"
            type="number"
            step="0.01"
            inputMode="decimal"
            required
            value={form.initialBalance}
            onChange={(e) =>
              setForm((f) => ({ ...f, initialBalance: e.target.value }))
            }
            placeholder="0,00"
          />
          <p className="-mt-2 text-xs text-slate-500">
            {editing ? (
              <>
                Saldo atual calculado (inicial + recebidos − pagos + transf.
                recebidas − transf. enviadas):{" "}
                <span className="font-medium tabular-nums text-slate-700">
                  {formatCurrency(Number(editing.balance))}
                </span>
              </>
            ) : (
              "O saldo atual passa a ser recalculado conforme despesas e entradas."
            )}
          </p>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <CardTitle>Últimas transferências</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">
            Movimentações internas entre contas — não entram em Total Recebido
            ou Total Pago.
          </p>
        </div>
        {transfers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Nenhuma transferência realizada ainda.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {transfers.map((transfer) => (
                <li key={transfer.id} className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                      {findBankAccountName(accounts, transfer.from_account_id) ?? "—"}
                      {" → "}
                      {findBankAccountName(accounts, transfer.to_account_id) ?? "—"}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleDeleteTransfer(transfer)}
                      aria-label={`Excluir transferência de ${formatCurrency(Number(transfer.amount))}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-xs text-slate-500">
                      {formatDate(transfer.transfer_date)}
                      {transfer.note ? ` · ${transfer.note}` : ""}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {formatCurrency(Number(transfer.amount))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Origem</th>
                    <th className="px-4 py-3 font-medium">Destino</th>
                    <th className="px-4 py-3 font-medium">Observação</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(transfer.transfer_date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {findBankAccountName(accounts, transfer.from_account_id) ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {findBankAccountName(accounts, transfer.to_account_id) ?? "—"}
                      </td>
                      <td className="max-w-55 truncate px-4 py-3 text-slate-600">
                        {transfer.note ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900">
                        {formatCurrency(Number(transfer.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDeleteTransfer(transfer)}
                            aria-label={`Excluir transferência de ${formatCurrency(Number(transfer.amount))}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accounts}
        onSaved={refresh}
      />

      <Modal
        open={needsTwoAccountsOpen}
        onClose={() => setNeedsTwoAccountsOpen(false)}
        title="Transferência indisponível"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Você precisa de pelo menos duas contas cadastradas para realizar
            transferências.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setNeedsTwoAccountsOpen(false)}>Entendi</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
