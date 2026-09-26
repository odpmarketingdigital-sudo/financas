"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";

async function fetchSettingsData() {
  const supabase = createClient();
  const [cliRes, catRes] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);
  return {
    clients: (cliRes.data as Client[]) ?? [],
    categories: (catRes.data as Category[]) ?? [],
  };
}

export function SettingsManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSettingsData().then(({ clients: cli, categories: cats }) => {
      if (cancelled) return;
      setClients(cli);
      setCategories(cats);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingClient(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada.");
      setSavingClient(false);
      return;
    }

    const { error: insertError } = await supabase.from("clients").insert({
      user_id: user.id,
      name: clientName.trim(),
      email: clientEmail.trim() || null,
      phone: clientPhone.trim() || null,
    });

    setSavingClient(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setClientName("");
    setClientEmail("");
    setClientPhone("");
    refresh();
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingCategory(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada.");
      setSavingCategory(false);
      return;
    }

    const { error: insertError } = await supabase.from("categories").insert({
      user_id: user.id,
      name: categoryName.trim(),
    });

    setSavingCategory(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCategoryName("");
    refresh();
  }

  async function deleteClient(id: string) {
    if (
      !confirm(
        "Excluir esta fonte de renda? Recebíveis vinculados podem impedir a exclusão.",
      )
    )
      return;
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);
    if (delError) {
      setError(delError.message);
      return;
    }
    refresh();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">
            Fontes de Renda
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Origens ou pagadores de quem a família recebe valores.
          </p>

          <form onSubmit={addClient} className="mt-4 flex flex-col gap-3">
            <Input
              id="client_name"
              label="Nome"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Salário, Mesada, Pensão, Cliente X"
            />
            <Input
              id="client_email"
              label="E-mail (opcional)"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
            <Input
              id="client_phone"
              label="Telefone (opcional)"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
            <Button type="submit" disabled={savingClient} className="w-full self-stretch sm:w-auto sm:self-start">
              {savingClient ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Nova Fonte de Renda
            </Button>
          </form>

          <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
            {clients.length === 0 && (
              <li className="py-4 text-sm text-slate-500">
                Nenhuma fonte de renda cadastrada.
              </li>
            )}
            {clients.map((client) => (
              <li
                key={client.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-slate-900">
                    {client.name}
                  </p>
                  {(client.email || client.phone) && (
                    <p className="mt-0.5 break-all text-xs text-slate-500">
                      {[client.email, client.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-rose-600 hover:bg-rose-50"
                  onClick={() => deleteClient(client.id)}
                  aria-label="Excluir fonte de renda"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">
            Categorias de despesas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Organize gastos por tipo (moradia, alimentação, etc.).
          </p>

          <form onSubmit={addCategory} className="mt-4 flex flex-col gap-3">
            <Input
              id="category_name"
              label="Nome da categoria"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ex.: Alimentação"
            />
            <Button
              type="submit"
              disabled={savingCategory}
              className="self-start"
            >
              {savingCategory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar categoria
            </Button>
          </form>

          <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
            {categories.length === 0 && (
              <li className="py-4 text-sm text-slate-500">
                Nenhuma categoria cadastrada.
              </li>
            )}
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-start justify-between gap-3 py-3"
              >
                <p className="min-w-0 flex-1 break-words text-sm font-medium text-slate-900">
                  {category.name}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-rose-600 hover:bg-rose-50"
                  onClick={() => deleteCategory(category.id)}
                  aria-label="Excluir categoria"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
