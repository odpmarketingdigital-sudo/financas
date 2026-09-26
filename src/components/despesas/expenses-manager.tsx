"use client";

import { useEffect, useState } from "react";
import { useMonth } from "@/contexts/month-context";
import { createClient } from "@/lib/supabase/client";
import type { Category, Expense, ExpenseStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

interface ExpenseFormState {
  description: string;
  category_id: string;
  amount: string;
  due_date: string;
  status: ExpenseStatus;
  payment_date: string;
}

const emptyForm: ExpenseFormState = {
  description: "",
  category_id: "",
  amount: "",
  due_date: "",
  status: "nao_paga",
  payment_date: "",
};

async function fetchExpensesData(referenceMonth: string) {
  const supabase = createClient();
  const [expRes, catRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, categories(id, name)")
      .eq("reference_month", referenceMonth)
      .order("due_date", { ascending: true }),
    supabase.from("categories").select("*").order("name"),
  ]);
  return {
    expenses: (expRes.data as Expense[]) ?? [],
    categories: (catRes.data as Category[]) ?? [],
  };
}

export function ExpensesManager() {
  const { referenceMonth } = useMonth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchExpensesData(referenceMonth).then(({ expenses: next, categories: cats }) => {
      if (cancelled) return;
      setExpenses(next);
      setCategories(cats);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [referenceMonth, reloadKey]);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      due_date: referenceMonth.slice(0, 8) + "15",
    });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setForm({
      description: expense.description,
      category_id: expense.category_id ?? "",
      amount: String(expense.amount),
      due_date: expense.due_date,
      status: expense.status,
      payment_date: expense.payment_date ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.status === "paga" && !form.payment_date) {
      setError("Data do pagamento é obrigatória quando o status é Paga.");
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

    const payload = {
      description: form.description.trim(),
      category_id: form.category_id || null,
      amount: Number(form.amount),
      due_date: form.due_date,
      status: form.status,
      payment_date: form.status === "paga" ? form.payment_date : null,
      reference_month: referenceMonth,
      user_id: user.id,
    };

    const result = editing
      ? await supabase.from("expenses").update(payload).eq("id", editing.id)
      : await supabase.from("expenses").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setModalOpen(false);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta despesa?")) return;
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova despesa
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            Nenhuma despesa neste mês. Cadastre a primeira!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {expense.description}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {expense.categories?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-900">
                      {formatCurrency(Number(expense.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(expense.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          expense.status === "paga" ? "success" : "warning"
                        }
                      >
                        {expense.status === "paga" ? "Paga" : "Não paga"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(expense.payment_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(expense)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleDelete(expense.id)}
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
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar despesa" : "Nova despesa"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            id="description"
            label="Descrição"
            required
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <Select
            id="category"
            label="Categoria"
            placeholder="Selecione (opcional)"
            value={form.category_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, category_id: e.target.value }))
            }
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
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
            id="due_date"
            label="Data de vencimento"
            type="date"
            required
            value={form.due_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, due_date: e.target.value }))
            }
          />
          <Select
            id="status"
            label="Status"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as ExpenseStatus,
                payment_date:
                  e.target.value === "nao_paga" ? "" : f.payment_date,
              }))
            }
            options={[
              { value: "nao_paga", label: "Não paga" },
              { value: "paga", label: "Paga" },
            ]}
          />
          {form.status === "paga" && (
            <Input
              id="payment_date"
              label="Data do pagamento"
              type="date"
              required
              value={form.payment_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, payment_date: e.target.value }))
              }
            />
          )}

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
    </div>
  );
}
