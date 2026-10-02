"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ColaboreModal } from "@/components/colabore-modal";
import { ColaboreContext } from "@/components/landing/colabore-context";

/**
 * Mantém **uma única instância** do `ColaboreModal` na raiz da Landing Page e
 * expõe `openColabore` via contexto para os botões "Colabore" (Header, seção
 * Sobre e faixa de CTA).
 *
 * Motivo: o Header é `sticky` + `backdrop-blur`, e o `backdrop-filter` cria um
 * *containing block* para descendentes `position: fixed`. Sem essa unificação, o
 * modal renderizado dentro do Header seria posicionado em relação a ele (e não à
 * viewport), ficando cortado no topo. Além disso, o `ColaboreModal` já renderiza
 * via `createPortal` diretamente no `document.body`, fora de qualquer container
 * pai.
 */
export function ColaboreProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openColabore = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openColabore }), [openColabore]);

  return (
    <ColaboreContext.Provider value={value}>
      {children}
      <ColaboreModal open={open} onClose={() => setOpen(false)} />
    </ColaboreContext.Provider>
  );
}