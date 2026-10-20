-- Cashly schema. Mirrors the Appwrite collections; see
-- docs/superpowers/specs/2026-10-20-supabase-migration-design.md.
-- Length limits match the Appwrite attribute sizes, no stricter, so every
-- existing row fits.

-- ---------------------------------------------------------------- helpers

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  name text not null default '' check (char_length(name) <= 128),
  default_currency text not null default 'BDT' check (default_currency ~ '^[A-Z]{3}$'),
  appwrite_user_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- accounts

create table public.accounts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(name) <= 40),
  type text not null check (type in ('cash', 'bank', 'mobile-wallet')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_idx on public.accounts (user_id, created_at);

-- Money rule: balances are bare numbers that take their currency from the
-- account, so changing it would silently re-value every transaction.
create function public.prevent_account_currency_change()
returns trigger language plpgsql as $$
begin
  if new.currency is distinct from old.currency then
    raise exception 'An account''s currency cannot be changed';
  end if;
  return new;
end $$;

create trigger accounts_currency_locked
  before update on public.accounts
  for each row execute function public.prevent_account_currency_change();

-- ---------------------------------------------------------------- people

create table public.people (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(name) <= 80),
  note text default '' check (char_length(note) <= 500),
  share_token text unique check (char_length(share_token) <= 36),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index people_user_idx on public.people (user_id, name);

-- ---------------------------------------------------------------- categories

create table public.categories (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('income', 'expense', 'exchange')),
  name text not null check (char_length(name) <= 40),
  icon text not null check (char_length(icon) <= 40),
  color text check (char_length(color) <= 9),
  is_custom boolean not null default false,
  -- null for the predefined categories everyone sees
  owner_id uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_owner_idx on public.categories (owner_id);

-- ---------------------------------------------------------------- transactions

create table public.transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete restrict,
  -- restrict: the database refuses to orphan a transaction
  account_id text not null references public.accounts (id) on delete restrict,
  type text not null check (type in ('income', 'expense', 'exchange', 'give', 'take')),
  -- Legacy major-unit float, kept in step with amount_minor (AGENTS.md).
  amount double precision not null,
  amount_minor bigint,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- No FK: deleting a category leaves its references, as on Appwrite. '' for
  -- give/take/exchange.
  category_id text not null default '' check (char_length(category_id) <= 36),
  payee text default '' check (char_length(payee) <= 200),
  note text default '' check (char_length(note) <= 500),
  date timestamptz not null,
  from_account_id text references public.accounts (id) on delete restrict,
  to_account_id text references public.accounts (id) on delete restrict,
  from_amount double precision,
  from_amount_minor bigint,
  to_amount double precision,
  to_amount_minor bigint,
  person_id text references public.people (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc, id desc);
create index transactions_user_account_idx on public.transactions (user_id, account_id, date desc);
create index transactions_from_account_idx on public.transactions (from_account_id);
create index transactions_to_account_idx on public.transactions (to_account_id);
create index transactions_person_idx on public.transactions (person_id);

-- ---------------------------------------------------------------- shares

create table public.shares (
  id text primary key default gen_random_uuid()::text,
  share_token text not null unique check (char_length(share_token) <= 36),
  person_name text not null check (char_length(person_name) <= 80),
  shared_by_name text check (char_length(shared_by_name) <= 80),
  person_id text not null references public.people (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  data text check (char_length(data) <= 500000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shares_person_idx on public.shares (person_id);

-- ---------------------------------------------------------------- updated_at

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger shares_updated_at before update on public.shares
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- access

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.people enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.shares enable row level security;

revoke all on public.profiles, public.accounts, public.people, public.categories,
  public.transactions, public.shares from anon;
grant select, insert, update, delete on public.accounts, public.people,
  public.transactions, public.shares to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.categories to authenticated;
grant all on public.profiles, public.accounts, public.people, public.categories,
  public.transactions, public.shares to service_role;

create policy "own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own accounts" on public.accounts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own people" on public.people for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own transactions" on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own shares" on public.shares for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "predefined or own categories" on public.categories for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "create own custom categories" on public.categories for insert to authenticated
  with check (owner_id = (select auth.uid()) and is_custom);
create policy "delete own custom categories" on public.categories for delete to authenticated
  using (owner_id = (select auth.uid()) and is_custom);

-- ---------------------------------------------------------------- migration
-- Verbatim copies of everything read from Appwrite. Not exposed to the API.

create schema migration;
revoke all on schema migration from public, anon, authenticated;

create table migration.source_users (
  appwrite_user_id text primary key,
  supabase_user_id uuid unique references auth.users (id) on delete restrict,
  document jsonb not null,
  copied_at timestamptz not null default now()
);

create table migration.source_documents (
  collection text not null,
  appwrite_id text not null,
  document jsonb not null,
  -- false for rows kept only here (their Appwrite user no longer exists)
  in_public_tables boolean not null,
  copied_at timestamptz not null default now(),
  primary key (collection, appwrite_id)
);

create table migration.runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  snapshot_file text not null,
  snapshot_sha256 text not null,
  result jsonb
);

-- One row once the app has switched to Supabase. While it exists, the copy
-- script refuses to reset anything.
create table migration.state (
  id boolean primary key default true check (id),
  cutover_at timestamptz not null default now()
);
