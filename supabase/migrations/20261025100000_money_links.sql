-- Connects utang and the wishlist to real accounts, so every number traces
-- back to money the user actually holds:
--
--   * utang and their repayments can name an account, and move its balance;
--   * money can be set aside in an account for a wishlist item or for paying
--     back an utang, without leaving the account;
--   * a bought wishlist item records its purchase as an expense transaction.
--
-- Lending and borrowing move balances but are not income or spending, so
-- they never reach the transactions table that Reports reads. The mobile app
-- writes these tables directly, so every rule here is enforced in the
-- database, not only in the apps.

-- Targets for the composite (id, user_id) foreign keys below, which stop a row
-- from pointing at another user's row even if RLS were bypassed.
alter table public.transactions add constraint transactions_id_user_id_key unique (id, user_id);
alter table public.wishlist_items add constraint wishlist_items_id_user_id_key unique (id, user_id);

-- ---------------------------------------------------------------------------
-- utang ↔ accounts
-- ---------------------------------------------------------------------------

-- owed_to_me: the account the lent money left. i_owe: the account the
-- borrowed money arrived in. Optional, so utang recorded before this (or with
-- cash nobody tracks) keep working.
alter table public.utang add column account_id uuid;
alter table public.utang add constraint utang_account_fkey
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete restrict;
create index utang_account_id_idx on public.utang (account_id) where account_id is not null;

-- owed_to_me: the account the repayment arrived in. i_owe: the account it was paid from.
alter table public.utang_payments add column account_id uuid;
alter table public.utang_payments add constraint utang_payments_account_fkey
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete restrict;
create index utang_payments_account_id_idx on public.utang_payments (account_id)
  where account_id is not null;

-- An account holds one currency, so money can only move in that currency.
create function public.validate_utang_account()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  account_currency char(3);
  utang_currency char(3);
begin
  if new.account_id is null then
    return new;
  end if;
  select a.currency into account_currency from public.accounts a where a.id = new.account_id;
  if tg_table_name = 'utang' then
    utang_currency := new.currency;
  else
    select u.currency into utang_currency from public.utang u where u.id = new.utang_id;
  end if;
  if account_currency is distinct from utang_currency then
    raise exception 'The account must be in the same currency as the utang'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger utang_validate_account
  before insert or update of account_id, currency on public.utang
  for each row execute function public.validate_utang_account();

create trigger utang_payments_validate_account
  before insert or update of account_id on public.utang_payments
  for each row execute function public.validate_utang_account();

-- ---------------------------------------------------------------------------
-- wishlist ↔ transactions
-- ---------------------------------------------------------------------------

-- The expense recorded when the item was bought; un-buying deletes it.
alter table public.wishlist_items add column purchase_transaction_id uuid;
alter table public.wishlist_items add constraint wishlist_items_purchase_fkey
  foreign key (purchase_transaction_id, user_id)
  references public.transactions (id, user_id) on delete set null (purchase_transaction_id);

-- "Saved so far" is now the money set aside for the item (set_asides below),
-- so it always traces to an account. The old free-typed figure can't be
-- mapped to an account and goes.
alter table public.wishlist_items drop column saved_cents;

-- ---------------------------------------------------------------------------
-- set_asides: money in an account reserved for one purpose
-- ---------------------------------------------------------------------------

create table public.set_asides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  -- Exactly one purpose: a wishlist item, or an utang the user owes.
  wishlist_item_id uuid,
  utang_id uuid,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 99999999999999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint set_asides_one_purpose check (num_nonnulls(wishlist_item_id, utang_id) = 1),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete restrict,
  -- Deleting the purpose releases the money: nothing is held for it any more.
  foreign key (wishlist_item_id, user_id)
    references public.wishlist_items (id, user_id) on delete cascade,
  foreign key (utang_id, user_id) references public.utang (id, user_id) on delete cascade
);

create index set_asides_account_id_idx on public.set_asides (account_id);
create index set_asides_wishlist_item_id_idx on public.set_asides (wishlist_item_id)
  where wishlist_item_id is not null;
create index set_asides_utang_id_idx on public.set_asides (utang_id) where utang_id is not null;

alter table public.set_asides enable row level security;

create policy "Users can view their own set-asides"
  on public.set_asides for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own set-asides"
  on public.set_asides for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own set-asides"
  on public.set_asides for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own set-asides"
  on public.set_asides for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger set_asides_set_updated_at
  before update on public.set_asides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- account_balances: now includes utang money and what is set aside
-- ---------------------------------------------------------------------------

create or replace view public.account_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.user_id,
  a.currency,
  a.opening_balance_cents
    + coalesce((
        select sum(
          case
            when t.type = 'income' and t.account_id = a.id then t.amount_cents
            when t.type = 'expense' and t.account_id = a.id then -t.amount_cents
            when t.type = 'transfer' and t.account_id = a.id then -t.amount_cents
            when t.type = 'transfer' and t.transfer_account_id = a.id then t.amount_cents
            else 0
          end)
        from public.transactions t
        where t.account_id = a.id or t.transfer_account_id = a.id
      ), 0)
    -- Lending takes money out; borrowing brings it in.
    + coalesce((
        select sum(case when u.direction = 'owed_to_me' then -u.amount_cents else u.amount_cents end)
        from public.utang u
        where u.account_id = a.id
      ), 0)
    -- Being paid back brings money in; paying back takes it out.
    + coalesce((
        select sum(case when u.direction = 'owed_to_me' then p.amount_cents else -p.amount_cents end)
        from public.utang_payments p
        join public.utang u on u.id = p.utang_id
        where p.account_id = a.id
      ), 0) as balance_cents,
  coalesce((select sum(s.amount_cents) from public.set_asides s where s.account_id = a.id), 0)
    as set_aside_cents
from public.accounts a;

-- ---------------------------------------------------------------------------
-- set-aside rules
-- ---------------------------------------------------------------------------

create function public.validate_set_aside()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  account_row record;
  purpose_currency char(3);
  utang_direction text;
  balance bigint;
  held_elsewhere bigint;
begin
  select a.currency, a.type into account_row from public.accounts a where a.id = new.account_id;
  -- A card balance is money owed, not money held, so nothing can be reserved in it.
  if account_row.type = 'credit_card' then
    raise exception 'Money can''t be set aside in a credit card' using errcode = 'check_violation';
  end if;

  if new.wishlist_item_id is not null then
    select w.currency into purpose_currency from public.wishlist_items w where w.id = new.wishlist_item_id;
  else
    select u.currency, u.direction into purpose_currency, utang_direction
    from public.utang u where u.id = new.utang_id;
    if utang_direction <> 'i_owe' then
      raise exception 'Money can only be set aside to pay back what you owe'
        using errcode = 'check_violation';
    end if;
  end if;
  if purpose_currency is distinct from account_row.currency then
    raise exception 'The account must be in the same currency' using errcode = 'check_violation';
  end if;

  -- Only money actually in the account, and not already set aside, can be set aside.
  select b.balance_cents into balance from public.account_balances b where b.account_id = new.account_id;
  select coalesce(sum(s.amount_cents), 0) into held_elsewhere
  from public.set_asides s
  where s.account_id = new.account_id and s.id <> new.id;
  if held_elsewhere + new.amount_cents > balance then
    raise exception 'Not enough money in the account to set that aside'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger set_asides_validate
  before insert or update on public.set_asides
  for each row execute function public.validate_set_aside();

-- A repayment uses up money set aside for it from the same account, and once
-- an utang is paid off nothing needs holding for it at all.
create function public.release_utang_set_asides()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  remaining_payment bigint := new.amount_cents;
  held record;
  total_cents bigint;
  paid_cents bigint;
begin
  if new.account_id is not null then
    for held in
      select s.id, s.amount_cents from public.set_asides s
      where s.utang_id = new.utang_id and s.account_id = new.account_id
      order by s.created_at
    loop
      exit when remaining_payment <= 0;
      if held.amount_cents <= remaining_payment then
        delete from public.set_asides where id = held.id;
        remaining_payment := remaining_payment - held.amount_cents;
      else
        update public.set_asides set amount_cents = held.amount_cents - remaining_payment
        where id = held.id;
        remaining_payment := 0;
      end if;
    end loop;
  end if;

  select u.amount_cents into total_cents from public.utang u where u.id = new.utang_id;
  select coalesce(sum(p.amount_cents), 0) into paid_cents
  from public.utang_payments p where p.utang_id = new.utang_id;
  if paid_cents >= total_cents then
    delete from public.set_asides where utang_id = new.utang_id;
  end if;
  return new;
end;
$$;

create trigger utang_payments_release_set_asides
  after insert on public.utang_payments
  for each row execute function public.release_utang_set_asides();

-- ---------------------------------------------------------------------------
-- Buying a wishlist item, all or nothing
-- ---------------------------------------------------------------------------

-- Records the purchase as an expense, marks the item bought, and releases the
-- money set aside for it, in one transaction so a failure leaves nothing half
-- done. security invoker: RLS and the tables' own triggers apply as usual.
create function public.buy_wishlist_item(
  item_id uuid,
  from_account_id uuid,
  paid_cents bigint,
  bought_on date,
  category_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item record;
  purchase_id uuid;
begin
  select w.name, w.currency, w.bought_on into item
  from public.wishlist_items w where w.id = item_id;
  if not found then
    raise exception 'This item no longer exists' using errcode = 'no_data_found';
  end if;
  if item.bought_on is not null then
    raise exception 'This item is already bought' using errcode = 'check_violation';
  end if;
  if (select a.currency from public.accounts a where a.id = from_account_id) is distinct from item.currency then
    raise exception 'The account must be in the same currency as the item' using errcode = 'check_violation';
  end if;

  -- Released first, so the money it held is free to pay for the purchase.
  delete from public.set_asides where wishlist_item_id = item_id;

  insert into public.transactions (type, amount_cents, account_id, category_id, occurred_on, note)
  values ('expense', paid_cents, from_account_id, category_id, bought_on, left(item.name, 500))
  returning id into purchase_id;

  update public.wishlist_items
  set bought_on = buy_wishlist_item.bought_on, purchase_transaction_id = purchase_id
  where id = item_id;
  return purchase_id;
end;
$$;

-- Puts a bought item back on the wishlist and removes the expense that
-- buying it recorded. Money set aside before isn't restored: it was spent.
create function public.unbuy_wishlist_item(item_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  purchase_id uuid;
begin
  select w.purchase_transaction_id into purchase_id from public.wishlist_items w where w.id = item_id;
  if not found then
    raise exception 'This item no longer exists' using errcode = 'no_data_found';
  end if;
  update public.wishlist_items set bought_on = null, purchase_transaction_id = null where id = item_id;
  if purchase_id is not null then
    delete from public.transactions where id = purchase_id;
  end if;
end;
$$;

-- Signed-in users only; RLS still limits them to their own rows.
revoke execute on function public.buy_wishlist_item(uuid, uuid, bigint, date, uuid) from public, anon;
revoke execute on function public.unbuy_wishlist_item(uuid) from public, anon;
grant execute on function public.buy_wishlist_item(uuid, uuid, bigint, date, uuid) to authenticated;
grant execute on function public.unbuy_wishlist_item(uuid) to authenticated;
