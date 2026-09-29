# Finanças Família

Aplicação educacional de **finanças pessoais** para ajudar famílias a organizar despesas e recebíveis. Construída com Next.js (App Router), Tailwind CSS e Supabase.

## Funcionalidades

- Autenticação com isolamento de dados por usuário (Supabase Auth)
- Seletor global de mês/ano (`reference_month`)
- Painel com resumos: a pagar, pago, a receber, recebido e resultados líquido previsto/realizado
- Gestão de despesas, recebíveis, clientes e categorias
- Cadastro de bancos e carteiras de dinheiro (com saldo por conta e marcação de dinheiro físico)
- Fluxo de caixa diário do mês: entradas, saídas, saldo do dia e saldo acumulado (página Caixa)

## Pré-requisitos

- Node.js 20.9+
- Projeto no [Supabase](https://supabase.com)

## Configuração

1. Instale as dependências:

```bash
npm install
```

2. Copie o modelo de variáveis de ambiente e preencha com as chaves do Supabase (Project Settings → API):

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

3. No SQL Editor do Supabase, execute o schema:

[`supabase/schema.sql`](./supabase/schema.sql)

4. Em Authentication → Providers, deixe o provedor **Email** habilitado. Para desenvolvimento, você pode desativar a confirmação de e-mail em Authentication → Settings.

5. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Estrutura principal

```
src/
  app/
    login/              # Login
    register/           # Registro
    dashboard/          # Painel e subpáginas
      despesas/
      recebiveis/
      bancos/
      configuracoes/
    caixa/              # Fluxo de caixa diário do mês
  components/           # UI e módulos de negócio
  constants/            # Categorias padrão (mescladas com as do banco)
  contexts/             # Seletor de mês/ano
  lib/supabase/         # Clientes browser/server
supabase/schema.sql     # Tabelas + RLS
```

## Scripts

| Comando       | Descrição              |
| ------------- | ---------------------- |
| `npm run dev` | Desenvolvimento        |
| `npm run build` | Build de produção    |
| `npm run start` | Servidor de produção |
| `npm run lint`  | ESLint               |
