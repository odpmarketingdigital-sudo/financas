import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CirclePlay,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  LogIn,
  Receipt,
  ShieldCheck,
  Smartphone,
  Tags,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ColaboreButton } from "@/components/colabore-modal";
import { ColaboreProvider } from "@/components/landing/colabore-provider";

export const metadata: Metadata = {
  title: "Tostão em Dia — Cada centavo no seu devido lugar",
  description:
    "Organização financeira simples para você e sua família. Controle contas bancárias, dinheiro físico e o livro caixa diário sem complicação.",
};

/**
 * URL de incorporação do vídeo tutorial (YouTube).
 * Pode ser sobrescrita pela env `NEXT_PUBLIC_TUTORIAL_VIDEO_URL`.
 */
const TUTORIAL_VIDEO_URL =
  process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL ??
  "https://www.youtube.com/embed/KMI6_LAj7IY";

/** Título exibido em destaque acima do vídeo da seção "Como Usar". */
const VIDEO_TITLE = "Vídeo Explicativo - Como Funciona o Tostão em Dia";

/** Tópicos cobertos no vídeo, para consulta rápida. */
const TOPICS = [
  "Cadastrar bancos",
  "Entradas",
  "Despesas",
  "Fluxo de caixa",
  "Transferências",
] as const;

/** Navegação principal (links de ancoragem das seções da Landing Page). */
const NAV_LINKS = [
  { href: "#sobre", label: "Sobre" },
  { href: "#recursos", label: "Recursos" },
  { href: "#como-usar", label: "Como Usar" },
] as const;

/** Links rápidos do rodapé. */
const FOOTER_LINKS = [
  { href: "#sobre", label: "Sobre" },
  { href: "#recursos", label: "Recursos" },
  { href: "#como-usar", label: "Como Usar" },
  { href: "/login", label: "Entrar" },
  { href: "/register", label: "Criar conta" },
] as const;

/** Guia rápido em 3 passos exibido junto ao vídeo. */
const STEPS = [
  {
    icon: Landmark,
    title: "Cadastre suas contas",
    description: "Itaú, Nubank, dinheiro na carteira — tudo em um só lugar.",
  },
  {
    icon: Receipt,
    title: "Lance suas despesas e recebíveis",
    description: "Registre o dia a dia em poucos toques, sem complicação.",
  },
  {
    icon: TrendingUp,
    title: "Acompanhe o caixa acumulado",
    description: "Veja o saldo atualizado em tempo real, dia após dia.",
  },
] as const;

/** Recursos principais da aplicação. */
const FEATURES = [
  {
    icon: TrendingUp,
    title: "Livro Caixa Diário",
    description: "Acompanhe a evolução do seu saldo dia após dia.",
  },
  {
    icon: Landmark,
    title: "Multicontas & Dinheiro Físico",
    description: "Saiba exatamente onde o seu dinheiro está guardado.",
  },
  {
    icon: Tags,
    title: "Categorias Personalizadas",
    description: "Entenda os gargalos do seu orçamento.",
  },
  {
    icon: ShieldCheck,
    title: "Feito para a Realidade Brasileira",
    description: "Simples, direto e focado no uso diário.",
  },
] as const;

/** Destaques exibidos na seção "Sobre". */
const ABOUT_HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Seus dados protegidos",
    description:
      "Autenticação com isolamento por usuário: cada família vê apenas as próprias informações.",
  },
  {
    icon: Smartphone,
    title: "Instale como um app",
    description:
      "Funciona direto no navegador e pode ser adicionado à tela inicial do celular (PWA).",
  },
  {
    icon: HeartHandshake,
    title: "Gratuito e comunitário",
    description:
      "Mantido aberto por contribuições voluntárias, sem planos nem cobranças escondidas.",
  },
] as const;

const primaryLinkClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

const secondaryLinkClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rota do app autenticado x login, conforme a sessão do Supabase.
  const appHref = user ? "/dashboard/painel" : "/login";
  const appLabel = user ? "Ir para meu Painel" : "Entrar no App";
  const AppIcon = user ? LayoutDashboard : LogIn;

  return (
    <ColaboreProvider>
      {/* Instância única do ColaboreModal fica no provider (raiz da página); os
          botões "Colabore" acionam-na via contexto. */}
      <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <HeartHandshake className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-slate-900">
                Tostão em Dia
              </span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                Cada centavo no seu devido lugar
              </span>
            </span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ColaboreButton size="sm" className="hidden sm:inline-flex" />
            <Link href={appHref} className={primaryLinkClass}>
              <AppIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{appLabel}</span>
              <span className="sm:hidden">App</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-semibold text-teal-800">
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              {" "}
              App Instalável no Celular (PWA)
            </span>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Tostão em Dia
              <span className="mt-3 block bg-gradient-to-r from-teal-700 to-sky-600 bg-clip-text text-transparent">
                Cada centavo no seu devido lugar.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Organização financeira simples para você e sua família. Controle
              contas bancárias, dinheiro físico e o livro caixa diário sem
              complicação.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={appHref} className={primaryLinkClass}>
                Começar Agora
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#como-usar" className={secondaryLinkClass}>
                <CirclePlay className="h-5 w-5" aria-hidden="true" />
                Ver Vídeo Tutorial
              </a>
            </div>
          </div>
        </section>

        {/* Sobre */}
        <section
          id="sobre"
          className="scroll-mt-20 border-t border-slate-200/70 bg-white/70"
        >
          <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Sobre
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Clareza financeira no dia a dia da sua família
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                O Tostão em Dia nasceu para simplificar o controle do dinheiro em
                casa. Em vez de planilhas complicadas, você organiza contas
                bancárias, o dinheiro físico da carteira e o livro caixa diário em
                um só lugar.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                É um projeto gratuito, feito para a realidade brasileira: direto,
                sem termos difíceis e focado no que realmente importa — saber
                quanto entra, quanto sai e para onde vai cada centavo.
              </p>
              <div className="mt-8">
                <ColaboreButton />
              </div>
            </div>

            <ul className="flex flex-col gap-4">
              {ABOUT_HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Como Usar (Vídeo Tutorial) */}
        <section
          id="como-usar"
          className="scroll-mt-20 border-t border-slate-200/70"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Como Usar
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Veja como funciona em minutos
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Assista ao tutorial e acompanhe o guia rápido em três passos para
                começar a organizar suas finanças hoje mesmo.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-4xl">
              <h3 className="text-base font-semibold text-slate-900">
                {VIDEO_TITLE}
              </h3>

              <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-2xl shadow-md ring-1 ring-slate-200">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={TUTORIAL_VIDEO_URL}
                  title={VIDEO_TITLE}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <ul className="mt-4 flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

            <ol className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, description }, index) => (
                <li
                  key={title}
                  className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
                >
                  <span className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Recursos */}
        <section
          id="recursos"
          className="scroll-mt-20 border-t border-slate-200/70 bg-white/70"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Recursos
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Tudo o que você precisa para organizar o mês
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Ferramentas simples e diretas, pensadas para o uso diário de quem
                cuida das contas da casa.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Colabore com o Projeto (CTA) */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-teal-700 px-6 py-12 text-center text-white shadow-lg sm:px-12">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <HeartHandshake className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="text-2xl font-bold sm:text-3xl">
                Ajude o Tostão em Dia a crescer
              </h2>
              <p className="text-sm leading-relaxed text-teal-50 sm:text-base">
                Sua contribuição voluntária ajuda a cobrir custos de servidor e a
                financiar a publicação do app nativo nas lojas.
              </p>
              <div className="mt-2">
                <ColaboreButton
                  variant="secondary"
                  className="bg-white text-teal-800 hover:bg-teal-50"
                >
                  Colabore com o Projeto
                </ColaboreButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
                <HeartHandshake className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-slate-900">
                Tostão em Dia
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Tostão em Dia — Gestão financeira simples e acessível.
            </p>
          </div>

          <nav aria-label="Links rápidos">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Links rápidos
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2">
              {FOOTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-600 transition-colors hover:text-teal-700"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-slate-200/70">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6">
            <p>
              © {new Date().getFullYear()} Tostão em Dia. Todos os direitos
              reservados.
            </p>
            <p>Cada centavo no seu devido lugar.</p>
          </div>
        </div>
      </footer>
      </div>
    </ColaboreProvider>
  );
}
