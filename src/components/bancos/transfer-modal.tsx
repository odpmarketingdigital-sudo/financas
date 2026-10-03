"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  recalculateBankAccountBalances,
  toBankAccountOptions,
} from "@/lib/bank-accounts";
import type { BankAccount } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  onSaved: () => void;
}

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function TransferModal({ open, onClose, accounts, onSaved }: TransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFromAccountId(accounts[0]?.id ?? "");
    setToAccountId(accounts[1]?.id ?? accounts[0]?.id ?? "");
    setAmount("");
    setTransferDate(todayKey());
    setNote("");
    setError(null);
    setSaving(false);
  }, [open, accounts]);

  const fromOptions = toBankAccountOptions(accounts);
  const toOptions = toBankAccountOptions(
    accounts.filter((a) => a.id !== fromAccountId),
  );
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fromAccountId || !toAccountId) {
      setError("Selecione a conta de origem e a conta de destino.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("A conta de destino precisa ser diferente da origem.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    if (!transferDate) {
      setError("Informe a data da transferência.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Sessão expirada. Faça login novamente.");
      return;
    }
    const trimmedNote = note.trim();
    const { error: insertError } = await supabase
      .from("account_transfers")
      .insert({
        user_id: user.id,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: value,
        transfer_date: transferDate,
        note: trimmedNote ? trimmedNote : null,
      });
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }
    await recalculateBankAccountBalances([fromAccountId, toAccountId]);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Transferir entre contas">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          id="transfer_from"
          label="Conta de origem"
          required
          placeholder="Selecione a origem"
          options={fromOptions}
          value={fromAccountId}
          onChange={(e) => {
            const next = e.target.value;
            setFromAccountId(next);
            if (next && toAccountId === next) {
              setToAccountId(accounts.find((a) => a.id !== next)?.id ?? "");
            }
          }}
        />
        <Select
          id="transfer_to"
          label="Conta de destino"
          required
          placeholder="Selecione o destino"
          options={toOptions}
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
        />
        <Input
          id="transfer_amount"
          label="Valor (R$)"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          id="transfer_date"
          label="Data da transferência"
          type="date"
          required
          value={transferDate}
          onChange={(e) => setTransferDate(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transfer_note" className="text-sm font-medium text-slate-700">
            Observação (opcional)
          </label>
          <textarea
            id="transfer_note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: Saque para despesas do mercado"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar transferência
          </Button>
        </div>
      </form>
    </Modal>
  );
}

