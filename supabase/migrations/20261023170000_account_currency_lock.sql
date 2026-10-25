-- An account's currency is fixed once it has transactions. Their amounts are
-- stored in that currency, so relabelling it would silently misstate every one
-- of them. The web app checks this too, but the mobile app updates accounts
-- directly, so the database is where the rule actually holds.

create function public.prevent_currency_change_with_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.currency is distinct from old.currency and exists (
    select 1 from public.transactions t
    where t.account_id = old.id or t.transfer_account_id = old.id
  ) then
    raise exception 'An account''s currency cannot change once it has transactions'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger accounts_lock_currency
  before update of currency on public.accounts
  for each row execute function public.prevent_currency_change_with_history();
