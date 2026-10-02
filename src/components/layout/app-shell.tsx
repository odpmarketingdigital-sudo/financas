import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { Sidebar } from "@/components/layout/sidebar";
import { MonthProvider } from "@/contexts/month-context";
import type { ReactNode } from "react";

/**
 * Estrutura das páginas autenticadas: menu lateral + seletor global de mês/ano
 * (o mesmo shell é usado por `/dashboard/*` e `/caixa`).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MonthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-20 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      {/* FAB global: visível em todas as páginas do dashboard/caixa. */}
      <QuickAddFab />
    </MonthProvider>
  );
}
