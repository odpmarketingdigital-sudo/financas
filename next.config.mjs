import withPWAInit, {
  runtimeCaching as defaultRuntimeCaching,
} from "@ducanh2912/next-pwa";

/**
 * Cache padrão do next-pwa sem a rota "cross-origin" (NetworkFirst).
 *
 * Essa rota guardava QUALQUER resposta cross-origin por até 1 hora — incluindo
 * as chamadas GET da API do Supabase. Com isso, o Caixa podia exibir dados
 * antigos (ex.: um saldo fixo de R$ 2.800,00) mesmo depois de contas/despesas/
 * recebíveis serem apagados, pois a resposta em cache era reutilizada quando a
 * rede demorava mais que 10s ou ficava indisponível.
 */
const defaultRuntimeCachingWithoutCrossOrigin = (
  defaultRuntimeCaching ?? []
).filter((entry) => entry?.options?.cacheName !== "cross-origin");

/**
 * O Livro Caixa e as demais telas financeiras precisam refletir sempre o estado
 * atual do banco, então requisições de API nunca são cacheadas: vão direto à
 * rede (`NetworkOnly`). Requisições cross-origin fora do precache (por exemplo,
 * os endpoints do Supabase) também não são cacheadas.
 */
const runtimeCaching = [
  {
    // Endpoints do Supabase (REST, Auth, Storage e Realtime).
    urlPattern: /^https:\/\/[^/]*\.supabase\.(?:co|in)\/.*/i,
    handler: "NetworkOnly",
  },
  {
    // Qualquer outra requisição cross-origin não será cacheada.
    urlPattern: ({ sameOrigin }) => !sameOrigin,
    handler: "NetworkOnly",
  },
  ...defaultRuntimeCachingWithoutCrossOrigin,
];

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Substitui a lista padrão de runtime caching (que incluía a rota
  // "cross-origin" que cacheava a API do Supabase por até 1 hora).
  extendDefaultRuntimeCaching: false,
  workboxOptions: {
    runtimeCaching,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* suas configurações do Next.js aqui */
};

export default withPWA(nextConfig);