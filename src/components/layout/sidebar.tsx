"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Landmark,
  Calculator,
  Settings,
  LogOut,
  Menu,
  X,
  Heart,
  HeartHandshake,
  CirclePlay,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ColaboreModal } from "@/components/colabore-modal";
import { ComoUsarModal } from "@/components/como-usar-modal";

const navItems = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/despesas", label: "Despesas", icon: Receipt },
  { href: "/dashboard/recebiveis", label: "Entradas", icon: Wallet },
  { href: "/caixa", label: "Fluxo de caixa", icon: Calculator },
  { href: "/dashboard/bancos", label: "Bancos / Carteiras", icon: Landmark },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  { href: "/dashboard/perfil", label: "Perfil", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [colaboreOpen, setColaboreOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  /** Abre o modal "Como Usar" (fechando o menu móvel, se estiver aberto). */
  function handleOpenHowTo() {
    setOpen(false);
    setHowToOpen(true);
  }

  /** Abre o modal "Colabore" (fechando o menu móvel, se estiver aberto). */
  function handleOpenColabore() {
    setOpen(false);
    setColaboreOpen(true);
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(href)
              ? "bg-teal-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}

      <div className="my-2 border-t border-slate-100" />

      <button
        type="button"
        onClick={handleOpenHowTo}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <CirclePlay className="h-4 w-4 shrink-0" />
        Como Usar
      </button>

      <button
        type="button"
        onClick={handleOpenColabore}
        className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-left text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100 hover:text-teal-800"
      >
        <Heart className="h-4 w-4 shrink-0" />
        Colabore
      </button>
    </nav>
  );

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between bg-teal-700 px-4 shadow-md lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-white hover:bg-teal-600 hover:text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <HeartHandshake className="h-6 w-6 text-white" aria-label="Finanças Família" />
        </div>
        <Link
          href="/dashboard/perfil"
          aria-label="Ir para o perfil"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <UserRound className="h-5 w-5" />
        </Link>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden items-center gap-2.5 border-b border-slate-100 px-5 py-5 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Toustão em dia</p>
            <p className="text-xs text-slate-500">Finanças pessoais</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 lg:hidden">
          <HeartHandshake className="h-5 w-5 text-teal-700" />
          <span className="font-semibold text-slate-900">Menu</span>
        </div>

        {nav}

        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <ComoUsarModal open={howToOpen} onClose={() => setHowToOpen(false)} />
      <ColaboreModal open={colaboreOpen} onClose={() => setColaboreOpen(false)} />
    </>
  );
}
