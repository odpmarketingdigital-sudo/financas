/**
 * Eventos globais do botão flutuante de ação rápida (QuickAddFab).
 *
 * Os formulários de despesa/entrada continuam a viver nos seus
 * gerenciadores (`ExpensesManager` / `ReceivablesManager`) — o FAB apenas
 * sinaliza a intenção de criar um novo registo. Quando o utilizador já está
 * na página correspondente, o gerenciador montado escuta o evento e abre o
 * seu modal local. Quando está noutra página, o FAB navega para a página
 * correta com `?nova=1`, e o gerenciador abre o modal ao montar.
 */

export const QUICK_ADD_EXPENSE_EVENT = "financas:quick-add-expense";
export const QUICK_ADD_RECEIVABLE_EVENT = "financas:quick-add-receivable";

/** Query param usado na navegação cross-page para auto-abrir o modal. */
export const QUICK_ADD_QUERY_PARAM = "nova";

export function requestQuickAddExpense() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(QUICK_ADD_EXPENSE_EVENT));
}

export function requestQuickAddReceivable() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(QUICK_ADD_RECEIVABLE_EVENT));
}

/**
 * Lê e consome o `?nova=1` do URL (apenas no cliente). Devolve `true` quando
 * o modal deve abrir automaticamente. Remove o param do URL para não
 * reabrir em refresh/navegação posterior.
 */
export function consumeQuickAddQueryParam(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(QUICK_ADD_QUERY_PARAM) !== "1") return false;
    url.searchParams.delete(QUICK_ADD_QUERY_PARAM);
    const next =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
      url.hash;
    window.history.replaceState(null, "", next);
    return true;
  } catch {
    return false;
  }
}
