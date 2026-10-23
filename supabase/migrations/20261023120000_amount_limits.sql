-- Caps every stored amount at 999,999,999,999.99 (MAX_AMOUNT_CENTS in
-- packages/shared). The apps check this too, but the mobile app writes straight
-- to these tables, so the database is the only place the limit is guaranteed.
-- The cap keeps sums exact in JavaScript, whose numbers lose precision past 2^53.

alter table public.accounts add constraint accounts_opening_balance_limit
  check (opening_balance_cents between -99999999999999 and 99999999999999);

alter table public.transactions add constraint transactions_amount_limit
  check (amount_cents <= 99999999999999);

alter table public.budgets add constraint budgets_amount_limit
  check (amount_cents <= 99999999999999);
