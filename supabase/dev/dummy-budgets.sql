-- Sample budgets for trying out the Budgets page on a local database.
-- Not a migration and not seed.sql: budgets belong to a user, and seed.sql
-- runs before any user exists. Run it after signing up, against local only:
--
--   docker exec -i supabase_db_money-manager psql -U postgres -d postgres < supabase/dev/dummy-budgets.sql
--
-- Safe to re-run: a budget that would clash with an existing one (a second
-- ongoing budget, or overlapping months) is skipped.

do $$
declare
  -- The account to fill in.
  target_email constant text := 'test@example.com';
  target_user uuid;
  target_currency char(3);
  inserted integer;
begin
  select id into target_user from auth.users where email = target_email;
  if target_user is null then
    raise exception 'No user with email %; sign up first', target_email;
  end if;

  select default_currency into target_currency from public.profiles where id = target_user;

  insert into public.budgets (user_id, category_id, amount_cents, currency, period, start_month, end_month)
  select
    target_user, c.id, sample.amount_cents, coalesce(target_currency, 'PHP'), sample.period,
    sample.start_month::date, sample.end_month::date
  from (values
    -- Close to its limit if the month already has grocery spending.
    ('Food & groceries', 300000, 'monthly', null, null),
    ('Eating out', 400000, 'monthly', null, null),
    ('Transport', 250000, 'monthly', null, null),
    ('Bills & utilities', 600000, 'monthly', null, null),
    ('Rent', 1800000, 'monthly', null, null),
    ('Entertainment', 200000, 'monthly', null, null),
    -- Yearly, for costs that don't land evenly: shown as a twelfth each month.
    ('Shopping', 3600000, 'yearly', null, null),
    ('Health', 2400000, 'yearly', null, null),
    -- A one-month range: stands in for the ongoing grocery budget in December.
    ('Food & groceries', 800000, 'range', '2026-12-01', '2026-12-01')
  ) as sample (category_name, amount_cents, period, start_month, end_month)
  join public.categories c
    on c.user_id = target_user
    and c.type = 'expense'
    and lower(c.name) = lower(sample.category_name)
  -- No conflict target, so clashes with either the one-ongoing index or the
  -- no-overlap exclusion constraint are skipped.
  on conflict do nothing;

  get diagnostics inserted = row_count;
  raise notice 'Added % budgets for %', inserted, target_email;
end $$;
