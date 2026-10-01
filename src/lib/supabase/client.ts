import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Nunca reutiliza respostas de cache (browser, CDN ou service worker):
        // o Caixa e as demais telas devem refletir sempre o estado atual do
        // banco, inclusive logo após contas/despesas/recebíveis serem apagados.
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    },
  );
}
