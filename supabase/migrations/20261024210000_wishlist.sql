-- Wishlist: things the user wants to buy or is saving up for. Like utang, it
-- stands apart from accounts: saving toward an item records intent, not money
-- moved, so no account balance changes. Mirrors packages/shared/src/wishlist.ts.

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  -- Only web links, so a stored value can never be a javascript: or data: URL
  -- that runs when someone clicks it.
  url text check (url ~* '^https?://' and char_length(url) <= 2048),
  -- Unknown until the person looks it up, so optional.
  price_cents bigint check (price_cents > 0 and price_cents <= 99999999999999),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  saved_cents bigint not null default 0 check (saved_cents between 0 and 99999999999999),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  note text check (char_length(note) <= 500),
  want_by date,
  -- Set once bought; null while still wanted.
  bought_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wishlist_items_user_id_idx on public.wishlist_items (user_id);

alter table public.wishlist_items enable row level security;

create policy "Users can view their own wishlist items"
  on public.wishlist_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own wishlist items"
  on public.wishlist_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own wishlist items"
  on public.wishlist_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own wishlist items"
  on public.wishlist_items for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger wishlist_items_set_updated_at
  before update on public.wishlist_items
  for each row execute function public.set_updated_at();
