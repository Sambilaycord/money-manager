-- A budget can be set per month or per year. Yearly budgets suit costs that
-- don't land evenly, like insurance or gifts; the apps show one twelfth of the
-- yearly amount against each month's spending. Existing budgets were all
-- monthly, which the default keeps them as.

alter table public.budgets add column period text not null default 'monthly'
  check (period in ('monthly', 'yearly'));
