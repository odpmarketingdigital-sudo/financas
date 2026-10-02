"use client";

import { Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface NoAccountModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Bloqueio de lançamentos sem conta: exibido quando o usuário tenta criar
 * uma despesa ou entrada sem ter nenhuma conta/carteira cadastrada.
 * O CTA leva para `/dashboard/bancos`; ao voltar, as telas recarregam a
 * lista de contas e o bloqueio sai automaticamente.
 */
export function NoAccountModal({ open, onClose }: NoAccountModalProps) {
  const router = useRouter();

  function handleRegister() {
    onClose();
    router.push("/dashboard/bancos");
  }

  return (
    <Modal open={open} onClose={onClose} title="Nenhuma conta ou carteira encontrada">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Landmark className="h-6 w-6" />
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          Para lançar despesas ou recebíveis, você precisa primeiro cadastrar
          onde o dinheiro vai entrar ou sair (ex: Nubank, Itaú ou Dinheiro em
          mãos).
        </p>
        <div className="flex w-full flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleRegister}>
            Cadastrar Banco / Carteira
          </Button>
        </div>
      </div>
    </Modal>
  );
}
