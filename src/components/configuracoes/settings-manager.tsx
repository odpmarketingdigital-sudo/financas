"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EXPENSE_CATEGORIES,
  RECEIVABLE_CATEGORIES,
} from "@/constants/categories";
import { mergeCategories } from "@/lib/categories";
import type { Category, CategoryType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";

async function fetchSettingsData() {
  const supabase = createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  return (data as Category[]) ?? [];
}

interface CategoryCardProps {
  type: CategoryType;
  title: string;
  description: string;
  placeholder: string;
  defaults: readonly string[];
  categories: Category[];
  name: string;
  saving: boolean;
  onNameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
}

function CategoryCard({
  type,
  title,
  description,
  placeholder,
  defaults,
  categories,
  name,
  saving,
  onNameChange,
  onSubmit,
  onDelete,
}: CategoryCardProps) {
  const defaultKeys = new Set(defaults.map((item) => item.trim().toLowerCase()));
  const options = mergeCategories(
    defaults,
    categories.map((category) => category.name),
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <Input
          id={`category_name_${type}`}
          label="Nome da categoria"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={placeholder}
        />
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Adicionar categoria
        </Button>
      </form>

      <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
        {options.map((option) => {
          const key = option.toLowerCase();
          const custom = defaultKeys.has(key)
            ? undefined
            : categories.find(
                (category) => category.name.trim().toLowerCase() === key,
              );

          return (
            <li
              key={option}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <p className="min-w-0 break-words text-sm font-medium text-slate-900">
                  {option}
                </p>
                {!custom && <Badge>Padrão</Badge>}
              </div>
              {custom && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-rose-600 hover:bg-rose-50"
                  onClick={() => onDelete(custom.id)}
                  aria-label={`Excluir categoria ${option}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function SettingsManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [expenseName, setExpenseName] = useState("");
  const [receivableName, setReceivableName] = useState("");
  const [savingType, setSavingType] = useState<CategoryType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSettingsData().then((cats) => {
      if (cancelled) return;
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

  async function addCategory(
    e: React.FormEvent,
    type: CategoryType,
    name: string,
  ) {
    e.preventDefault();
    setError(null);
    setSavingType(type);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sessão expirada.");
      setSavingType(null);
      return;
    }

    const { error: insertError } = await supabase
      .from("categories")
      .insert({ user_id: user.id, name: name.trim(), type });

    setSavingType(null);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (type === "expense") setExpenseName("");
    else setReceivableName("");

    refresh();
  }

  async function deleteCategory(id: string) {
    if (
      !confirm(
        "Excluir esta categoria? Os lançamentos já salvos mantêm o texto da categoria.",
      )
    )
      return;
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    if (delError) {
      setError(delError.message);
      return;
    }
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
        <CategoryCard
          type="expense"
          title="Categorias de despesas"
          description="Organize os gastos por tipo. As categorias padrão já vêm prontas e novas podem ser adicionadas."
          placeholder="Ex.: Alimentação"
          defaults={EXPENSE_CATEGORIES}
          categories={categories.filter((c) => c.type === "expense")}
          name={expenseName}
          saving={savingType === "expense"}
          onNameChange={setExpenseName}
          onSubmit={(e) => addCategory(e, "expense", expenseName)}
          onDelete={deleteCategory}
        />

        <CategoryCard
          type="receivable"
          title="Fontes de renda (entradas)"
          description="Origens de quem a família recebe valores. As categorias padrão já vêm prontas e novas podem ser adicionadas."
          placeholder="Ex.: Salário"
          defaults={RECEIVABLE_CATEGORIES}
          categories={categories.filter((c) => c.type === "receivable")}
          name={receivableName}
          saving={savingType === "receivable"}
          onNameChange={setReceivableName}
          onSubmit={(e) => addCategory(e, "receivable", receivableName)}
          onDelete={deleteCategory}
        />
      </div>
    </div>
  );
}
