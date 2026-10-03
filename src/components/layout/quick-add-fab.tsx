"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchBankAccounts, hasBankAccounts } from "@/lib/bank-accounts";
import type { BankAccount } from "@/lib/types";
import {
  requestQuickAddExpense,
  requestQuickAddReceivable,
} from "@/lib/quick-add-events";
import { NoAccountModal } from "@/components/ui/no-account-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TransferModal } from "@/components/bancos/transfer-modal";

/**
 * Botão flutuante de ação rápida (FAB / Speed Dial) visível em todas as
 * páginas do Dashboard. Abre o modal de Nova Despesa, Nova Entrada ou
 * Nova Transferência:
 * - se já estiver na página correspondente, dispara um evento global que o
 *   gerenciador montado escuta e abre o seu modal local;
 * - caso contrário, navega para a página com `?nova=1`, e o gerenciador
 *   abre o modal automaticamente ao montar.
 * - transferências abrem o `TransferModal` diretamente (após carregar as
 *   contas), com aviso quando há menos de 2 contas cadastradas.
 */
export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [noAccountOpen, setNoAccountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [needsTwoAccountsOpen, setNeedsTwoAccountsOpen] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // Fecha o speed dial ao trocar de página e com a tecla Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Guarda do FAB: verifica contas no Supabase antes de abrir/navegar.
   * - Na página de destino, delega ao gerenciador (evento → `guardedOpenCreate`
   *   com revalidação), evitando modal duplicado.
   * - Fora da página de destino, checa aqui e exibe o bloqueio local sem navegar.
   */
  async function guardedNavigate(
    targetPath: "/dashboard/despesas" | "/dashboard/recebiveis",
    request: () => void,
  ) {
    setOpen(false);
    if (pathname === targetPath) {
      request();
      return;
    }
    if (await hasBankAccounts()) {
      router.push(`${targetPath}?nova=1`);
      return;
    }
    setNoAccountOpen(true);
  }

  function handleNewExpense() {
    void guardedNavigate("/dashboard/despesas", requestQuickAddExpense);
  }

  function handleNewReceivable() {
    void guardedNavigate("/dashboard/recebiveis", requestQuickAddReceivable);
  }

  /**
   * Nova Transferência: fecha o speed dial, carrega as contas e abre o
   * TransferModal. Com menos de 2 contas, exibe o aviso em vez do formulário.
   */
  async function handleNewTransfer() {
    setOpen(false);
    const list = await fetchBankAccounts();
    setAccounts(list);
    if (list.length < 2) {
      setNeedsTwoAccountsOpen(true);
      return;
    }
    setTransferOpen(true);
  }

  /**
   * Após salvar a transferência pelo FAB, recarrega as contas guardadas para
   * manter o modal consistente caso seja reaberto sem nova consulta.
   */
  async function handleTransferSaved() {
    setAccounts(await fetchBankAccounts());
  }

  return (
    <>
      {/* Backdrop discreto: fecha o menu ao clicar fora. */}
      {open && (
        <button
          type="button"
          aria-label="Fechar menu de ações rápidas"
          className="fixed inset-0 z-30 cursor-default bg-slate-900/20"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pb-[max(0px,env(safe-area-inset-bottom))]">
        {/* Submenu — aparece logo acima do botão principal. O container fica
            sempre `pointer-events-none` para que os vãos entre os botões
            deixem os cliques passar; cada botão reativa o clique individual. */}
        <div
          className={cn(
            "pointer-events-none flex flex-col items-end gap-2 overflow-visible py-1 transition-all duration-200 sm:gap-3",
            open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
          aria-hidden={!open}
        >
          <button
            type="button"
            onClick={handleNewTransfer}
            tabIndex={open ? 0 : -1}
            className={cn("group flex items-center gap-3", open && "pointer-events-auto")}
          >
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md transition-colors group-hover:border-sky-200 group-hover:text-sky-700 whitespace-nowrap">
              Transferência
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              <ArrowLeftRight className="h-5 w-5" />
            </span>
          </button>

          <button
            type="button"
            onClick={handleNewReceivable}
            tabIndex={open ? 0 : -1}
            className={cn("group flex items-center gap-3", open && "pointer-events-auto")}
          >
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md transition-colors group-hover:border-emerald-200 group-hover:text-emerald-700 whitespace-nowrap">
              Nova Entrada
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              <TrendingUp className="h-5 w-5" />
            </span>
          </button>

          <button
            type="button"
            onClick={handleNewExpense}
            tabIndex={open ? 0 : -1}
            className={cn("group flex items-center gap-3", open && "pointer-events-auto")}
          >
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md transition-colors group-hover:border-rose-200 group-hover:text-rose-700 whitespace-nowrap">
              Nova Despesa
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              <TrendingDown className="h-5 w-5" />
            </span>
          </button>
        </div>

        {/* Botão principal */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Fechar ações rápidas" : "Adicionar despesa, entrada ou transferência"}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg transition-all duration-200 hover:bg-teal-800 hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          <Plus
            className={cn(
              "h-6 w-6 transition-transform duration-200",
              open && "rotate-45",
            )}
          />
        </button>
      </div>

      {/* Bloqueio local do FAB (fora das páginas de destino): mesmo modal
          reutilizado pelos gerenciadores, sem navegar para outra página. */}
      <NoAccountModal
        open={noAccountOpen}
        onClose={() => setNoAccountOpen(false)}
      />

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accounts}
        onSaved={() => void handleTransferSaved()}
      />

      <Modal
        open={needsTwoAccountsOpen}
        onClose={() => setNeedsTwoAccountsOpen(false)}
        title="Transferência indisponível"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Você precisa de pelo menos duas contas cadastradas para realizar
            transferências.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setNeedsTwoAccountsOpen(false)}>
              Entendi
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
