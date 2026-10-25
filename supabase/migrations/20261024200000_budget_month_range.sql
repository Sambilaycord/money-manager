-- Budgets for a stretch of months: a trip, a project, or one heavy month like
-- December. A 'range' budget covers start_month through end_month, and its
-- amount is the total for those months, shared evenly across them (the apps
-- do the split; see monthlyLimitCents in packages/shared/src/budgets.ts).
--
-- A category may now hold several budgets: at most one ongoing ('monthly' or
-- 'yearly'), plus any number of ranges that don't overlap each other. A range
-- takes priority over the ongoing budget in the months it covers. The mobile
-- app writes budgets directly, so these rules live here, not only in the apps.

-- btree_gist lets one exclusion constraint compare the uuid category with = and
-- the month ranges with &&.
create extension if not exists btree_gist with schema extensions;

alter table public.budgets
  add column start_month date,
  add column end_month date;

alter table public.budgets drop constraint budgets_period_check;
alter table public.budgets add constraint budgets_period_check
  check (period in ('monthly', 'yearly', 'range'));

-- Months are stored as their first day, so a month compares and overlaps as a
-- single point.
alter table public.budgets add constraint budgets_range_shape check (
  case
    when period = 'range' then
      start_month is not null
      and end_month is not null
      and extract(day from start_month) = 1
      and extract(day from end_month) = 1
      and end_month >= start_month
    else
      start_month is null and end_month is null
  end
);

alter table public.budgets drop constraint budgets_category_id_key;

create unique index budgets_one_ongoing_per_category
  on public.budgets (category_id)
  where period <> 'range';

alter table public.budgets add constraint budgets_ranges_do_not_overlap
  exclude using gist (category_id with =, daterange(start_month, end_month, '[]') with &&)
  where (period = 'range');
