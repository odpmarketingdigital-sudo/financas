"use client";

import { useEffect } from "react";
import { CirclePlay, Landmark, Receipt, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** URL de incorporação do vídeo tutorial (YouTube/Vimeo), opcional. */
const TUTORIAL_VIDEO_URL = process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL;

/** Guia rápido em 3 passos. */
const STEPS = [
  {
    icon: Landmark,
    title: "Cadastre suas contas",
    description: "Itaú, Nubank e o dinheiro da carteira, tudo em um só lugar.",
  },
  {
    icon: Receipt,
    title: "Lance despesas e recebíveis",
    description: "Registre o dia a dia em poucos toques, sem complicação.",
  },
  {
    icon: TrendingUp,
    title: "Acompanhe o caixa acumulado",
    description: "Veja o saldo atualizado em tempo real, dia após dia.",
  },
] as const;

interface ComoUsarModalProps {
  open: boolean;
  onClose: () => void;
}

/** Modal com o vídeo tutorial e o guia rápido de uso do sistema. */
export function ComoUsarModal({ open, onClose }: ComoUsarModalProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="como-usar-modal-title"
          className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl"
        >
          <h2
            id="como-usar-modal-title"
            className="pr-10 text-lg font-semibold text-slate-900"
          >
            Como Usar o Tostão em Dia
          </h2>

          <div className="mt-5 flex flex-col gap-5">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
              {TUTORIAL_VIDEO_URL ? (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={TUTORIAL_VIDEO_URL}
                  title="Vídeo tutorial do Tostão em Dia"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-teal-800 to-slate-900 px-6 text-center text-white">
                  <CirclePlay className="h-9 w-9" aria-hidden="true" />
                  <p className="text-sm font-semibold">
                    Vídeo tutorial em breve
                  </p>
                  <p className="text-xs text-teal-100">
                    Espaço pronto para receber o vídeo (YouTube/Vimeo).
                  </p>
                </div>
              )}
            </div>

            <ol className="flex flex-col gap-3">
              {STEPS.map(({ icon: Icon, title, description }, index) => (
                <li
                  key={title}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-teal-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Icon className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                      {title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
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
    </div>
  );
}