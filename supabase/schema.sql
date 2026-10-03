-- Finanças Pessoais — Schema Supabase
-- Execute este script no SQL Editor do Supabase (Dashboard > SQL Editor)

-- Extensão para UUIDs
create extension if not exists "pgcrypto";

-- =====================
-- CATEGORIAS DE DESPESAS
-- =====================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'expense' check (type in ('expense', 'receivable')),
  created_at timestamptz not null default now(),
  unique (user_id, type, name)
);

alter table public.categories enable row level security;

create policy "categories_select_own"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "categories_insert_own"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "categories_update_own"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories_delete_own"
  on public.categories for delete
  using (auth.uid() = user_id);

-- =====================
-- CLIENTES
-- =====================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients_select_own"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "clients_insert_own"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "clients_update_own"
  on public.clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "clients_delete_own"
  on public.clients for delete
  using (auth.uid() = user_id);

-- =====================
-- DESPESAS
-- =====================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  category text,
  -- legado (depreciado): a categoria agora é gravada como texto em `category`
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date not null,
  status text not null check (status in ('paga', 'nao_paga')) default 'nao_paga',
  payment_date date,
  reference_month date not null,
  created_at timestamptz not null default now(),
  constraint expenses_payment_date_when_paid
    check (
      (status = 'nao_paga' and payment_date is null)
      or (status = 'paga' and payment_date is not null)
    )
);

create index if not exists expenses_user_month_idx
  on public.expenses (user_id, reference_month);

alter table public.expenses enable row level security;

create policy "expenses_select_own"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "expenses_insert_own"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "expenses_update_own"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses_delete_own"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- =====================
-- RECEBÍVEIS
-- =====================
create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text,
  -- legado (depreciado): mantido anulável para compatibilidade
  client_id uuid references public.clients(id) on delete set null,
  description text not null,
  amount_due numeric(12, 2) not null check (amount_due >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  due_date date not null,
  status text not null check (status in ('recebido', 'a_receber')) default 'a_receber',
  payment_date date,
  reference_month date not null,
  created_at timestamptz not null default now()
);

create index if not exists receivables_user_month_idx
  on public.receivables (user_id, reference_month);

alter table public.receivables enable row level security;

create policy "receivables_select_own"
  on public.receivables for select
  using (auth.uid() = user_id);

create policy "receivables_insert_own"
  on public.receivables for insert
  with check (auth.uid() = user_id);

create policy "receivables_update_own"
  on public.receivables for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "receivables_delete_own"
  on public.receivables for delete
  using (auth.uid() = user_id);

-- =====================
-- MIGRAÇÃO: CATEGORIAS COMO TEXTO
-- Execute esta seção em bancos já existentes — o script é idempotente.
-- Categorias de despesas e recebíveis passam a ser gravadas como texto,
-- a partir das listas em `src/constants/categories.ts`.
-- =====================
alter table public.expenses add column if not exists category text;
alter table public.receivables add column if not exists category text;

-- `client_id` deixa de ser obrigatório em recebíveis
alter table public.receivables alter column client_id drop not null;

-- Preenche `category` a partir dos vínculos antigos (somente quando vazio)
update public.expenses e
  set category = c.name
  from public.categories c
  where e.category_id = c.id
    and e.category is null;

update public.receivables r
  set category = cl.name
  from public.clients cl
  where r.client_id = cl.id
    and r.category is null;

-- =====================
-- BANCOS E CARTEIRAS DE DINHEIRO
-- `is_cash = true` representa dinheiro físico/espécie (carteira).
-- =====================
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric(12, 2) not null default 0,
  is_cash boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists bank_accounts_user_idx
  on public.bank_accounts (user_id);

alter table public.bank_accounts enable row level security;

-- Políticas criadas em bloco para manter o script idempotente
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_accounts'
      and policyname = 'bank_accounts_select_own'
  ) then
    create policy "bank_accounts_select_own"
      on public.bank_accounts for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_accounts'
      and policyname = 'bank_accounts_insert_own'
  ) then
    create policy "bank_accounts_insert_own"
      on public.bank_accounts for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_accounts'
      and policyname = 'bank_accounts_update_own'
  ) then
    create policy "bank_accounts_update_own"
      on public.bank_accounts for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_accounts'
      and policyname = 'bank_accounts_delete_own'
  ) then
    create policy "bank_accounts_delete_own"
      on public.bank_accounts for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- =====================
-- MIGRAÇÃO: TIPO DE CATEGORIA ('expense' | 'receivable')
-- As categorias personalizadas passam a ser classificadas por tipo.
-- =====================
alter table public.categories
  add column if not exists type text not null default 'expense';

-- A unicidade passa a considerar o tipo (ex.: "Outros" nos dois tipos)
alter table public.categories
  drop constraint if exists categories_user_id_name_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'categories_user_id_type_name_key'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_user_id_type_name_key
      unique (user_id, type, name);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'categories_type_check'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_type_check
      check (type in ('expense', 'receivable'));
  end if;
end $$;

-- =====================
-- MIGRAÇÃO: CONTA BANCÁRIA / DINHEIRO EM DESPESAS E RECEBÍVEIS
-- `bank_account_id` aponta para a conta/carteira em `bank_accounts`.
-- A coluna nasce nula para não invalidar registros antigos; a
-- obrigatoriedade é aplicada nos formulários da aplicação.
-- =====================
alter table public.expenses
  add column if not exists bank_account_id uuid
    references public.bank_accounts(id) on delete set null;

alter table public.receivables
  add column if not exists bank_account_id uuid
    references public.bank_accounts(id) on delete set null;

create index if not exists expenses_bank_account_idx
  on public.expenses (bank_account_id);

create index if not exists receivables_bank_account_idx
  on public.receivables (bank_account_id);

-- =====================
-- MIGRAÇÃO: SALDO INICIAL E SALDO REAL CALCULADO DAS CONTAS
-- `initial_balance` guarda o saldo de abertura informado pelo usuário e é a
-- base do cálculo. `balance` passa a ser o saldo real, recalculado pela
-- aplicação a cada movimentação (despesas/recebíveis) e na abertura das
-- telas que exibem saldos:
--   balance = initial_balance + recebíveis recebidos − despesas pagas
-- =====================
alter table public.bank_accounts
  add column if not exists initial_balance numeric(12, 2);

-- Contas criadas antes da migração usam o saldo atual como saldo inicial.
update public.bank_accounts
  set initial_balance = balance
  where initial_balance is null;

alter table public.bank_accounts
  alter column initial_balance set default 0;

alter table public.bank_accounts
  alter column initial_balance set not null;

-- =====================
-- TRANSFERÊNCIAS ENTRE CONTAS
-- Movimentação interna (origem → destino). O saldo real passa a considerar:
--   balance = initial_balance + recebíveis recebidos − despesas pagas
--           + transferências recebidas (to_account_id)
--           − transferências enviadas (from_account_id)
-- Transferências NÃO entram em "Total Recebido"/"Total Pago" (só expenses e
-- receivables alimentam esses cards).
-- =====================
create table if not exists public.account_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  to_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  transfer_date date not null,
  note text,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

create index if not exists account_transfers_user_idx
  on public.account_transfers (user_id);

create index if not exists account_transfers_from_idx
  on public.account_transfers (from_account_id);

create index if not exists account_transfers_to_idx
  on public.account_transfers (to_account_id);

alter table public.account_transfers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_transfers'
      and policyname = 'account_transfers_select_own'
  ) then
    create policy "account_transfers_select_own"
      on public.account_transfers for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_transfers'
      and policyname = 'account_transfers_insert_own'
  ) then
    create policy "account_transfers_insert_own"
      on public.account_transfers for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_transfers'
      and policyname = 'account_transfers_update_own'
  ) then
    create policy "account_transfers_update_own"
      on public.account_transfers for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_transfers'
      and policyname = 'account_transfers_delete_own'
  ) then
    create policy "account_transfers_delete_own"
      on public.account_transfers for delete
      using (auth.uid() = user_id);
  end if;
end $$;
