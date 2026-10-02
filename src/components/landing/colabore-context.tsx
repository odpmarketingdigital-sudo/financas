"use client";

import { createContext, useContext } from "react";

export interface ColaboreContextValue {
  /** Abre o modal "Colabore" (instância única na raiz da Landing Page). */
  openColabore: () => void;
}

/**
 * Contexto que expõe `openColabore` para os botões "Colabore" da Landing Page
 * (Header, seção Sobre e faixa de CTA), mantendo **uma única instância** do
 * `ColaboreModal` na raiz da página.
 *
 * O `ColaboreProvider` (componente cliente) é quem fornece o valor; por isso o
 * contexto fica em um arquivo separado — assim o `colabore-modal.tsx` pode
 * consumi-lo sem criar importação circular com o provider.
 */
export const ColaboreContext = createContext<ColaboreContextValue | null>(null);

/**
 * Acessa o controlador do modal "Colabore". Retorna `null` quando não há
 * `ColaboreProvider` acima — nesse caso o `ColaboreButton` gerencia o próprio
 * modal (usado, por exemplo, em contextos fora da Landing Page).
 */
export function useColabore(): ColaboreContextValue | null {
  return useContext(ColaboreContext);
}