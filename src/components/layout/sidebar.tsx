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
  HeartHandshake,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard/despesas", label: "Despesas", icon: Receipt },
  { href: "/dashboard/recebiveis", label: "Recebíveis", icon: Wallet },
  { href: "/dashboard/bancos", label: "Bancos / Carteiras", icon: Landmark },
  { href: "/caixa", label: "Caixa", icon: Calculator },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
    </nav>
  );

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-teal-700" />
          <span className="font-semibold text-slate-900">Finanças Família</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
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
            <p className="text-sm font-semibold text-slate-900">Finanças Família</p>
            <p className="text-xs text-slate-500">Gestão compartilhada</p>
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
    </>
  );
}
