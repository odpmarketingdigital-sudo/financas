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
  created_at timestamptz not null default now(),
  unique (user_id, name)
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
  client_id uuid not null references public.clients(id) on delete restrict,
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
