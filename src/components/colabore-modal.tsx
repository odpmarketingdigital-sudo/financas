"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  Heart,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useColabore } from "@/components/landing/colabore-context";

/**
 * Chave PIX que recebe as contribuições voluntárias para o projeto.
 * Padrão: telefone `17996129158`. Sobrescreva em `.env.local` com
 * `NEXT_PUBLIC_PIX_KEY`.
 */
const PIX_KEY = process.env.NEXT_PUBLIC_PIX_KEY ?? "17996129158";

interface ColaboreModalProps {
  open: boolean;
  onClose: () => void;
}

/** Modal de colaboração comunitária (apoio voluntário via PIX). */
export function ColaboreModal({ open, onClose }: ColaboreModalProps) {
  const [copied, setCopied] = useState(false);
  // Só monta o portal após a hidratação no cliente — `document` não existe
  // durante a renderização no servidor (evita erro de hidratação no Next.js).
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Guarda de montagem no cliente: o portal (`document.body`) só pode ser
    // criado depois da hidratação, evitando erros de Hydration no Next.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  async function handleCopyKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
    } catch {
      // Fallback para navegadores/contextos sem a Clipboard API.
      const helper = document.createElement("textarea");
      helper.value = PIX_KEY;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="colabore-modal-title"
          className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl my-auto"
        >
          <h2
            id="colabore-modal-title"
            className="pr-10 text-lg font-semibold text-slate-900"
          >
            Ajude o Tostão em Dia a crescer!
          </h2>

          <div className="mt-5 flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-slate-600">
              O Tostão em Dia é um projeto criado para ajudar pessoas e famílias
              a conquistarem clareza financeira. Sua contribuição voluntária
              ajuda a cobrir custos de servidor e financiar a publicação do app
              nativo na Google Play Store e Apple App Store.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Chave PIX
                </p>
                <Sparkles className="h-4 w-4 text-teal-600" aria-hidden="true" />
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900">
                  {PIX_KEY}
                </code>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyKey}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  {copied ? "Chave Copiada!" : "Copiar Chave PIX"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                <QRCodeSVG value={PIX_KEY} size={180} />
              </div>
              <p className="text-center text-xs text-slate-500">
                Escaneie com o aplicativo do seu banco
              </p>
            </div>

            <p className="flex items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-center text-sm font-medium text-teal-800">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Qualquer valor ajuda a manter o projeto gratuito e ativo para
              todos!
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 bg-background/90 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>,
    document.body,
  );
}

interface ColaboreButtonProps {
  children?: ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}

/**
 * Botão de "Colabore". Quando existe um `ColaboreProvider` acima (Landing
 * Page), aciona a instância única do modal na raiz da página via contexto —
 * assim o modal não é renderizado dentro do Header `sticky`/`backdrop-blur`
 * (que quebraria o posicionamento). Sem provider, gerencia o próprio modal.
 */
export function ColaboreButton({
  children,
  className,
  variant = "outline",
  size = "md",
}: ColaboreButtonProps) {
  const colabore = useColabore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => (colabore ? colabore.openColabore() : setOpen(true))}
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        {children ?? "Colabore"}
      </Button>
      {!colabore && (
        <ColaboreModal open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}