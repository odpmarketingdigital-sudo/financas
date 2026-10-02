"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMonth } from "@/contexts/month-context";
import {
  QUICK_ADD_RECEIVABLE_EVENT,
  consumeQuickAddQueryParam,
} from "@/lib/quick-add-events";
import { createClient } from "@/lib/supabase/client";
import { RECEIVABLE_CATEGORIES } from "@/constants/categories";
import {
  fetchBankAccounts,
  findBankAccountName,
  hasBankAccounts,
  recalculateBankAccountBalances,
  toBankAccountOptions,
} from "@/lib/bank-accounts";
import { mergeCategories, toCategoryOptions } from "@/lib/categories";
import type { BankAccount, Receivable, ReceivableStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { NoAccountModal } from "@/components/ui/no-account-modal";
import { Card } from "@/components/ui/card";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

interface ReceivableFormState {
  category: string;
  description: string;
  amount: string;
  date: string;
  status: ReceivableStatus;
  bank_account_id: string;
}

const emptyForm: ReceivableFormState = {
  category: "",
  description: "",
  amount: "",
  date: "",
  status: "a_receber",
  bank_account_id: "",
};

async function fetchReceivablesData(referenceMonth: string) {
  const supabase = createClient();
  const [recRes, catRes, accounts] = await Promise.all([
    supabase
      .from("receivables")
      .select("*")
      .eq("reference_month", referenceMonth)
      .order("due_date", { ascending: true }),
    supabase
      .from("categories")
      .select("name")
      .eq("type", "receivable")
      .order("name", { ascending: true }),
    fetchBankAccounts(),
  ]);

  return {
    receivables: (recRes.data as Receivable[]) ?? [],
    customCategories: ((catRes.data ?? []) as { name: string }[]).map(
      (category) => category.name,
    ),
    accounts,
  };
}

export function ReceivablesManager() {
  const { referenceMonth } = useMonth();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [noAccountOpen, setNoAccountOpen] = useState(false);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [form, setForm] = useState<ReceivableFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchReceivablesData(referenceMonth).then(
      ({
        receivables: next,
        customCategories: custom,
        accounts: nextAccounts,
      }) => {
        if (cancelled) return;
        setReceivables(next);
        setCustomCategories(custom);
        setAccounts(nextAccounts);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [referenceMonth, reloadKey]);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  function openCreate() {
    // Bloqueio: sem conta/carteira cadastrada exibe o alerta em vez do form.
    if (accounts.length === 0) {
      setNoAccountOpen(true);
      return;
    }
    setEditing(null);
    setForm({
      ...emptyForm,
      date: referenceMonth.slice(0, 8) + "15",
    });
    setError(null);
    setModalOpen(true);
  }

  /**
   * Entrada protegida: revalida a lista de contas no Supabase antes de decidir
   * (cobre o caso de o usuário ter acabado de cadastrar o primeiro banco e
   * voltar para esta tela sem recarregar — o bloqueio sai imediatamente).
   */
  async function guardedOpenCreate() {
    if (accounts.length > 0) {
      openCreate();
      return;
    }
    const ok = await hasBankAccounts();
    if (ok) {
      const next = await fetchBankAccounts();
      setAccounts(next);
      if (next.length === 0) {
        setNoAccountOpen(true);
        return;
      }
      setEditing(null);
      setForm({
        ...emptyForm,
        date: referenceMonth.slice(0, 8) + "15",
      });
      setError(null);
      setModalOpen(true);
      return;
    }
    setNoAccountOpen(true);
  }

  // FAB global: abre o modal via evento (mesma página) ou `?nova=1` (navegação).
  useEffect(() => {
    const handler = () => void guardedOpenCreate();
    window.addEventListener(QUICK_ADD_RECEIVABLE_EVENT, handler);
    return () => window.removeEventListener(QUICK_ADD_RECEIVABLE_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceMonth, accounts]);

  useEffect(() => {
    if (consumeQuickAddQueryParam()) void guardedOpenCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ao voltar de `/dashboard/bancos` (foco na aba), recarrega as contas para
  // liberar o botão "Nova entrada" assim que o primeiro banco for criado.
  useEffect(() => {
    const onFocus = async () => {
      const next = await fetchBankAccounts();
      setAccounts((prev) => (prev.length === next.length ? prev : next));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function openEdit(item: Receivable) {
    setEditing(item);
    setForm({
      category: item.category ?? "",
      description: item.description,
      amount: String(item.amount_due),
      date:
        item.status === "recebido" && item.payment_date
          ? item.payment_date
          : item.due_date,
      status: item.status,
      bank_account_id: item.bank_account_id ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.category) {
      setError("Selecione uma categoria / fonte de renda.");
      return;
    }

    if (!form.date) {
      setError("Informe a data prevista / recebimento.");
      return;
    }

    if (!form.bank_account_id) {
      setError("Selecione a conta bancária / dinheiro.");
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

    const amount = Number(form.amount);
    const isReceived = form.status === "recebido";

    // amount → amount_due; se Recebido, payment_date atua como receipt_date
    const payload = {
      category: form.category,
      description: form.description.trim(),
      amount_due: amount,
      amount_paid: isReceived ? amount : 0,
      due_date: form.date,
      status: form.status,
      payment_date: isReceived ? form.date : null,
      reference_month: referenceMonth,
      bank_account_id: form.bank_account_id,
      user_id: user.id,
    };

    // Conta usada antes da edição — o saldo dela também precisa ser reajustado.
    const previousAccountId = editing?.bank_account_id ?? null;

    const result = editing
      ? await supabase.from("receivables").update(payload).eq("id", editing.id)
      : await supabase.from("receivables").insert(payload);

    if (result.error) {
      setSaving(false);
      setError(result.error.message);
      return;
    }

    // Saldo real = saldo inicial + recebidos − pagos. Recalcula a conta de
    // origem e a de destino (cobre troca de banco e mudança de valor/status).
    await recalculateBankAccountBalances([
      previousAccountId,
      payload.bank_account_id,
    ]);

    setSaving(false);
    setModalOpen(false);
    refresh();
  }

  async function handleDelete(item: Receivable) {
    if (!confirm("Excluir esta entrada?")) return;
    const supabase = createClient();
    await supabase.from("receivables").delete().eq("id", item.id);
    // Desfaz a entrada do saldo da conta vinculada à entrada excluída.
    await recalculateBankAccountBalances([item.bank_account_id]);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => void guardedOpenCreate()}>
          <Plus className="h-4 w-4" />
          Nova entrada
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : receivables.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            Nenhuma entrada neste mês.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {receivables.map((item) => (
                <li key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {item.description}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {item.category ?? "—"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.status === "recebido" ? "success" : "warning"
                      }
                    >
                      {item.status === "recebido" ? "Recebido" : "A receber"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Valor</p>
                      <p className="font-semibold tabular-nums text-slate-900">
                        {formatCurrency(Number(item.amount_due))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">
                        Data prevista / recebimento
                      </p>
                      <p className="text-slate-700">
                        {formatDate(
                          item.status === "recebido" && item.payment_date
                            ? item.payment_date
                            : item.due_date,
                        )}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">Conta</p>
                      <p className="text-slate-700">
                        {findBankAccountName(accounts, item.bank_account_id) ??
                          "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 border-t border-slate-50 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(item)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleDelete(item)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">
                      Data prevista / recebimento
                    </th>
                    <th className="px-4 py-3 font-medium">Conta</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivables.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.category ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatCurrency(Number(item.amount_due))}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(
                          item.status === "recebido" && item.payment_date
                            ? item.payment_date
                            : item.due_date,
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {findBankAccountName(accounts, item.bank_account_id) ??
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.status === "recebido" ? "success" : "warning"
                          }
                        >
                          {item.status === "recebido"
                            ? "Recebido"
                            : "A receber"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(item)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDelete(item)}
                            aria-label="Excluir"
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
        title={editing ? "Editar entrada" : "Nova entrada"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Select
            id="category"
            label="Categoria"
            required
            placeholder="Selecione"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            options={toCategoryOptions(
              mergeCategories(RECEIVABLE_CATEGORIES, customCategories),
            )}
          />
          <Select
            id="bank_account_id"
            label="Conta bancária / Dinheiro"
            required
            placeholder={
              accounts.length === 0 ? "Nenhuma conta cadastrada" : "Selecione"
            }
            disabled={accounts.length === 0}
            value={form.bank_account_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, bank_account_id: e.target.value }))
            }
            options={toBankAccountOptions(accounts)}
          />
          {accounts.length === 0 && (
            <p className="-mt-2 text-xs text-slate-500">
              Nenhuma conta cadastrada.{" "}
              <Link
                href="/dashboard/bancos"
                className="font-medium text-teal-700 underline"
              >
                Cadastre uma conta ou carteira
              </Link>{" "}
              para vincular a entrada.
            </p>
          )}
          <Input
            id="description"
            label="Descrição"
            required
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <Input
            id="amount"
            label="Valor"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Input
            id="date"
            label="Data prevista / recebimento"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Select
            id="status"
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as ReceivableStatus,
              }))
            }
            options={[
              { value: "a_receber", label: "A receber" },
              { value: "recebido", label: "Recebido" },
            ]}
          />

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
      <NoAccountModal open={noAccountOpen} onClose={() => setNoAccountOpen(false)} />
    </div>
  );
}
