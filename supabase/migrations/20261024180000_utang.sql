-- Utang: money lent to or borrowed from people, kept apart from accounts.
-- Recording one never moves an account balance; it tracks who owes whom and
-- how much has been paid back. Mirrors packages/shared/src/utang.ts.

-- ---------------------------------------------------------------------------
-- utang: one row per debt, in either direction
-- ---------------------------------------------------------------------------

create table public.utang (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- owed_to_me: the person owes the user. i_owe: the user owes the person.
  direction text not null check (direction in ('owed_to_me', 'i_owe')),
  -- Just a name, not a link to another user: the other side usually doesn't use the app.
  person text not null check (char_length(btrim(person)) between 1 and 80),
  -- The full amount lent or borrowed. What is still owed is this minus payments.
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 99999999999999),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  note text check (char_length(note) <= 500),
  -- Calendar dates, not timestamps, so "overdue" never depends on a time zone.
  incurred_on date not null default current_date,
  due_on date check (due_on is null or due_on >= incurred_on),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The target of utang_payments' composite foreign key.
  unique (id, user_id)
);

create index utang_user_id_idx on public.utang (user_id);

alter table public.utang enable row level security;

create policy "Users can view their own utang"
  on public.utang for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own utang"
  on public.utang for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own utang"
  on public.utang for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own utang"
  on public.utang for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger utang_set_updated_at
  before update on public.utang
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- utang_payments: partial or full repayments of one utang
-- ---------------------------------------------------------------------------

create table public.utang_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  utang_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 99999999999999),
  paid_on date not null default current_date,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Composite, so a payment can only attach to the same user's utang; RLS
  -- alone would still let someone point a payment at another user's id.
  foreign key (utang_id, user_id)
    references public.utang (id, user_id) on delete cascade
);

create index utang_payments_utang_id_idx on public.utang_payments (utang_id);

alter table public.utang_payments enable row level security;

create policy "Users can view their own utang payments"
  on public.utang_payments for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own utang payments"
  on public.utang_payments for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own utang payments"
  on public.utang_payments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own utang payments"
  on public.utang_payments for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger utang_payments_set_updated_at
  before update on public.utang_payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payments can never add up to more than the utang. The apps check this too,
-- but the mobile app writes straight to these tables, so it is guaranteed here.
-- ---------------------------------------------------------------------------

create function public.validate_utang_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total_cents bigint;
  other_payments_cents bigint;
begin
  -- Locks the utang row, so two payments saved at once can't both pass the check.
  select u.amount_cents into total_cents from public.utang u where u.id = new.utang_id for update;

  select coalesce(sum(p.amount_cents), 0) into other_payments_cents
  from public.utang_payments p
  where p.utang_id = new.utang_id and p.id <> new.id;

  if other_payments_cents + new.amount_cents > total_cents then
    raise exception 'Payments cannot add up to more than the utang'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger utang_payments_validate
  before insert or update on public.utang_payments
  for each row execute function public.validate_utang_payment();

-- Lowering an utang's amount below what has already been paid would leave a
-- negative balance, so it is refused rather than silently clamped.
create function public.validate_utang_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  paid_cents bigint;
begin
  select coalesce(sum(p.amount_cents), 0) into paid_cents
  from public.utang_payments p
  where p.utang_id = new.id;

  if new.amount_cents < paid_cents then
    raise exception 'The amount cannot be less than what has already been paid'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger utang_validate_amount
  before update of amount_cents on public.utang
  for each row execute function public.validate_utang_amount();
