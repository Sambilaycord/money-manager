-- Initial schema: profiles, accounts, categories, transactions, budgets.
--
-- Conventions:
--   * Money is bigint minor units (cents). Never numeric/float.
--   * Every table carries user_id, defaults it to auth.uid(), and is locked to
--     its owner by RLS. The mobile app talks to these tables directly with the
--     anon key, so RLS is the only thing standing between users.
--   * Cross-table references use composite (id, user_id) foreign keys, so a row
--     can only point at another row owned by the same user. RLS alone would
--     still let a user attach their transaction to someone else's account id.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  default_currency char(3) not null default 'PHP' check (default_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- accounts: where money lives (bank, e-wallet, card, cash, ...)
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  type text not null check (type in ('cash', 'bank', 'e_wallet', 'credit_card', 'savings', 'investment', 'other')),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  opening_balance_cents bigint not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index accounts_user_id_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "Users can view their own accounts"
  on public.accounts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own accounts"
  on public.accounts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own accounts"
  on public.accounts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own accounts"
  on public.accounts for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories: how income and expenses are grouped
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index categories_user_type_name_key
  on public.categories (user_id, type, lower(name));

alter table public.categories enable row level security;

create policy "Users can view their own categories"
  on public.categories for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own categories"
  on public.categories for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own categories"
  on public.categories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own categories"
  on public.categories for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transactions: income, expenses, and transfers between accounts
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  category_id uuid,
  transfer_account_id uuid,
  type text not null check (type in ('income', 'expense', 'transfer')),
  -- Always positive; `type` gives the direction.
  amount_cents bigint not null check (amount_cents > 0),
  note text check (char_length(note) <= 500),
  -- A calendar date, not a timestamp, so "which month" never depends on the
  -- viewer's time zone.
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Accounts with history can't be deleted; archive them instead.
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete restrict,
  foreign key (transfer_account_id, user_id)
    references public.accounts (id, user_id) on delete restrict,
  -- Deleting a category un-categorises its transactions rather than deleting them.
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),

  constraint transactions_transfer_shape check (
    case
      when type = 'transfer' then
        transfer_account_id is not null
        and transfer_account_id <> account_id
        and category_id is null
      else
        transfer_account_id is null
    end
  )
);

create index transactions_user_occurred_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_transfer_account_idx on public.transactions (transfer_account_id)
  where transfer_account_id is not null;
create index transactions_category_idx on public.transactions (category_id)
  where category_id is not null;

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own transactions"
  on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Rules that span tables, which CHECK constraints can't express.
create function public.validate_transaction()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  category_type text;
  from_currency char(3);
  to_currency char(3);
begin
  if new.category_id is not null then
    select c.type into category_type from public.categories c where c.id = new.category_id;
    if category_type is distinct from new.type then
      raise exception 'Category type (%) does not match transaction type (%)', category_type, new.type
        using errcode = 'check_violation';
    end if;
  end if;

  -- Amounts are stored once, in one currency, so a transfer between accounts
  -- in different currencies would silently create or destroy money.
  if new.type = 'transfer' then
    select a.currency into from_currency from public.accounts a where a.id = new.account_id;
    select a.currency into to_currency from public.accounts a where a.id = new.transfer_account_id;
    if from_currency is distinct from to_currency then
      raise exception 'Transfers must be between accounts in the same currency'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_validate
  before insert or update on public.transactions
  for each row execute function public.validate_transaction();

-- ---------------------------------------------------------------------------
-- budgets: a monthly spending limit per expense category
-- ---------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete cascade,
  unique (category_id)
);

create index budgets_user_id_idx on public.budgets (user_id);

alter table public.budgets enable row level security;

create policy "Users can view their own budgets"
  on public.budgets for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own budgets"
  on public.budgets for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create function public.validate_budget()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categories c where c.id = new.category_id and c.type = 'expense'
  ) then
    raise exception 'Budgets can only be set on expense categories'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger budgets_validate
  before insert or update on public.budgets
  for each row execute function public.validate_budget();

-- ---------------------------------------------------------------------------
-- account_balances: balances derived from transactions, never stored, so they
-- can't drift out of sync. security_invoker makes the view obey the caller's
-- RLS instead of the view owner's.
-- ---------------------------------------------------------------------------

create view public.account_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.user_id,
  a.currency,
  a.opening_balance_cents
    + coalesce(sum(
        case
          when t.type = 'income' and t.account_id = a.id then t.amount_cents
          when t.type = 'expense' and t.account_id = a.id then -t.amount_cents
          when t.type = 'transfer' and t.account_id = a.id then -t.amount_cents
          when t.type = 'transfer' and t.transfer_account_id = a.id then t.amount_cents
          else 0
        end
      ), 0) as balance_cents
from public.accounts a
left join public.transactions t
  on t.account_id = a.id or t.transfer_account_id = a.id
group by a.id;

-- ---------------------------------------------------------------------------
-- New user setup: profile + starter categories
-- ---------------------------------------------------------------------------

-- security definer because it runs from auth's insert, before the new user
-- has a session; search_path is pinned so it can't be hijacked.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));

  insert into public.categories (user_id, name, type)
  select new.id, starter.name, starter.type
  from (values
    ('Salary', 'income'),
    ('Freelance', 'income'),
    ('Other income', 'income'),
    ('Food & groceries', 'expense'),
    ('Eating out', 'expense'),
    ('Transport', 'expense'),
    ('Bills & utilities', 'expense'),
    ('Rent', 'expense'),
    ('Shopping', 'expense'),
    ('Health', 'expense'),
    ('Entertainment', 'expense'),
    ('Other expenses', 'expense')
  ) as starter (name, type);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
