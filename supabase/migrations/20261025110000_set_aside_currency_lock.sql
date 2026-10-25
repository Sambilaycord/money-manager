-- Money set aside for a wishlist item or an utang sits in an account of that
-- item's currency. Changing the item's currency afterwards would leave, say,
-- pesos reserved for a dollar item, so it's refused until the money is
-- released. The mobile app writes these tables directly, so this lives here.

create function public.lock_currency_with_set_asides()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.currency is distinct from old.currency and exists (
    select 1 from public.set_asides s
    where (tg_table_name = 'wishlist_items' and s.wishlist_item_id = new.id)
       or (tg_table_name = 'utang' and s.utang_id = new.id)
  ) then
    raise exception 'Release the money set aside before changing the currency'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger wishlist_items_lock_currency
  before update of currency on public.wishlist_items
  for each row execute function public.lock_currency_with_set_asides();

create trigger utang_lock_currency
  before update of currency on public.utang
  for each row execute function public.lock_currency_with_set_asides();
