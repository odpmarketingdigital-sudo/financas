"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Landmark, Tags, LogOut, Loader2,
  ShieldCheck, Mail, CalendarDays, PencilLine,
} from "lucide-react";

function formatMemberSince(isoDate: string | undefined): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  const f = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return f.charAt(0).toUpperCase() + f.slice(1);
}

function getInitials(name: string, email: string): string {
  const base = name.trim() || email.trim();
  if (!base) return "?";
  if (base.includes("@") && !name.trim()) return base.charAt(0).toUpperCase();
  const parts = base.split(" ");
  const clean = parts.filter(Boolean);
  if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase();
  return (clean[0][0] + clean[clean.length - 1][0]).toUpperCase();
}

export function ProfileManager() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [categoriesCount, setCategoriesCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!currentUser) { router.push("/login"); return; }
      setUser(currentUser);
      const meta = currentUser.user_metadata?.full_name;
      setDisplayName(typeof meta === "string" ? meta : "");
      setLoading(false);
      const [accRes, catRes] = await Promise.all([
        supabase.from("bank_accounts").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setAccountsCount(accRes.count ?? 0);
      setCategoriesCount(catRes.count ?? 0);
      setStatsLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const next = displayName.trim();
    if (!next) { setFormError("Informe um nome para exibição."); return; }
    setSavingName(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: next } });
    setSavingName(false);
    if (error) {
      setFormError(error.message);
      setToast({ type: "error", message: `Não foi possível salvar: ${error.message}` });
      return;
    }
    if (data.user) setUser(data.user);
    setToast({ type: "success", message: "Nome atualizado com sucesso!" });
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoggingOut(false);
    setLogoutOpen(false);
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-slate-400 dark:text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const metaName = user.user_metadata?.full_name;
  const fullName =
    typeof metaName === "string" && metaName.trim() ? metaName.trim() : "Sem nome definido";
  const email = user.email ?? "—";
  const memberSince = formatMemberSince(user.created_at);
  const createdLong = user.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  const initials = getInitials(fullName === "Sem nome definido" ? "" : fullName, email);

  return (
    <div className="space-y-6">
      {toast && (
        <div role="status" className={toast.type === "success" ? "fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg dark:border-emerald-800 dark:bg-emerald-950 sm:left-auto sm:right-6" : "fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-lg dark:border-rose-800 dark:bg-rose-950 sm:left-auto sm:right-6"}>
          <span className={toast.type === "success" ? "text-sm font-medium text-emerald-800 dark:text-emerald-200" : "text-sm font-medium text-rose-800 dark:text-rose-200"}>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar" className="ml-auto shrink-0 opacity-60 hover:opacity-100">x</button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center px-2 py-4 text-center sm:flex-row sm:text-left lg:flex-col lg:text-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xl font-bold text-white shadow-sm dark:bg-teal-600">
              {initials}
            </div>
            <div className="mt-4 min-w-0 sm:ml-5 sm:mt-0 lg:ml-0 lg:mt-4">
              <h2 className="break-words text-lg font-semibold text-slate-900 dark:text-slate-100">{fullName}</h2>
              <p className="mt-1 flex items-center justify-center gap-1.5 break-all text-sm text-slate-500 sm:justify-start lg:justify-center dark:text-slate-400">
                <Mail className="h-3.5 w-3.5 shrink-0" />{email}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start lg:justify-center">
                <Badge variant="success"><CalendarDays className="mr-1 h-3 w-3" />Membro desde {memberSince}</Badge>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            Conta criada em {createdLong}. Dados do seu login no Supabase Auth.
          </div>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <PencilLine className="h-5 w-5 text-teal-700 dark:text-teal-400" />Nome de exibição
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Salvo nos metadados da sua conta.</p>
            <form onSubmit={handleSaveName} className="mt-4 flex flex-col gap-3">
              <Input id="display_name" label="Nome completo" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex.: Maria Silva" autoComplete="name" maxLength={80} />
              {formError && (<p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{formError}</p>)}
              <Button type="submit" disabled={savingName} className="self-start">
                {savingName && <Loader2 className="h-4 w-4 animate-spin" />}{savingName ? "Salvando..." : "Salvar nome"}
              </Button>
            </form>
          </Card>
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Resumo do uso do app</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Estatísticas rápidas da sua conta.</p>
            {statsLoading ? (
              <div className="flex justify-center py-8 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"><Landmark className="h-5 w-5" /></div>
                  <div className="min-w-0"><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{accountsCount ?? 0}</p><p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Contas / Carteiras</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"><Tags className="h-5 w-5" /></div>
                  <div className="min-w-0"><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{categoriesCount ?? 0}</p><p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Categorias personalizadas</p></div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      <Card className="dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <ShieldCheck className="h-5 w-5 text-teal-700 dark:text-teal-400" />Segurança e sessão
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Encerre a sessão atual neste dispositivo.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" variant="danger" onClick={() => setLogoutOpen(true)} className="w-full sm:w-auto">
            <LogOut className="h-4 w-4" />Sair da conta
          </Button>
          <p className="text-xs text-slate-400 dark:text-slate-500">Sessão ativa para {email}</p>
        </div>
      </Card>
      <Modal open={logoutOpen} onClose={() => !loggingOut && setLogoutOpen(false)} title="Sair da conta?">
        <p className="text-sm text-slate-600 dark:text-slate-300">Deseja encerrar sua sessão? Você será redirecionado para o login.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setLogoutOpen(false)} disabled={loggingOut} className="w-full sm:w-auto">Cancelar</Button>
          <Button type="button" variant="danger" onClick={handleLogout} disabled={loggingOut} className="w-full sm:w-auto">
            {loggingOut && <Loader2 className="h-4 w-4 animate-spin" />}{loggingOut ? "Saindo..." : "Sim, sair"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

