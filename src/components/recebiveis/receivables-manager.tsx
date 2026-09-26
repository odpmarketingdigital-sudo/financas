"use client";

import { useEffect, useState } from "react";
import { useMonth } from "@/contexts/month-context";
import { createClient } from "@/lib/supabase/client";
import type { Client, Receivable, ReceivableStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

interface ReceivableFormState {
  client_id: string;
  description: string;
  amount: string;
  date: string;
  status: ReceivableStatus;
}

const emptyForm: ReceivableFormState = {
  client_id: "",
  description: "",
  amount: "",
  date: "",
  status: "a_receber",
};

async function fetchReceivablesData(referenceMonth: string) {
  const supabase = createClient();
  const [recRes, cliRes] = await Promise.all([
    supabase
      .from("receivables")
      .select("*, clients(id, name)")
      .eq("reference_month", referenceMonth)
      .order("due_date", { ascending: true }),
    supabase.from("clients").select("*").order("name"),
  ]);
  return {
    receivables: (recRes.data as Receivable[]) ?? [],
    clients: (cliRes.data as Client[]) ?? [],
  };
}

export function ReceivablesManager() {
  const { referenceMonth } = useMonth();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [form, setForm] = useState<ReceivableFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchReceivablesData(referenceMonth).then(
      ({ receivables: next, clients: cli }) => {
        if (cancelled) return;
        setReceivables(next);
        setClients(cli);
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
    setEditing(null);
    setForm({
      ...emptyForm,
      date: referenceMonth.slice(0, 8) + "15",
    });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: Receivable) {
    setEditing(item);
    setForm({
      client_id: item.client_id,
      description: item.description,
      amount: String(item.amount_due),
      date:
        item.status === "recebido" && item.payment_date
          ? item.payment_date
          : item.due_date,
      status: item.status,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.client_id) {
      setError("Selecione uma fonte / pagador.");
      return;
    }

    if (!form.date) {
      setError("Informe a data prevista / recebimento.");
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
      client_id: form.client_id,
      description: form.description.trim(),
      amount_due: amount,
      amount_paid: isReceived ? amount : 0,
      due_date: form.date,
      status: form.status,
      payment_date: isReceived ? form.date : null,
      reference_month: referenceMonth,
      user_id: user.id,
    };

    const result = editing
      ? await supabase.from("receivables").update(payload).eq("id", editing.id)
      : await supabase.from("receivables").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setModalOpen(false);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este recebível?")) return;
    const supabase = createClient();
    await supabase.from("receivables").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} disabled={clients.length === 0}>
          <Plus className="h-4 w-4" />
          Novo recebível
        </Button>
      </div>

      {clients.length === 0 && !loading && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Cadastre pelo menos uma fonte de renda em Configurações antes de criar
          recebíveis.
        </p>
      )}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : receivables.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            Nenhum recebível neste mês.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Fonte/Origem</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">
                    Data prevista / recebimento
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivables.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.clients?.name ?? "—"}
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
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === "recebido" ? "success" : "warning"
                        }
                      >
                        {item.status === "recebido" ? "Recebido" : "A receber"}
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
                          onClick={() => handleDelete(item.id)}
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
        title={editing ? "Editar recebível" : "Novo recebível"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Select
            id="client"
            label="Fonte / Pagador"
            placeholder="Ex: Salário, Mesada, Pensão, Cliente X"
            required
            value={form.client_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, client_id: e.target.value }))
            }
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
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
    </div>
  );
}
