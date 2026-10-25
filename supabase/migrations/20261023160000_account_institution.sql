-- The bank or e-wallet that holds an account, separate from the person's own
-- name for it: "Taiwan Trip Savings" at "GoTyme Bank". Free text, because the
-- app's list of known brands is a convenience, not a register of every bank.
-- Optional: cash and many personal accounts have no institution.

alter table public.accounts add column institution text
  check (char_length(trim(institution)) between 1 and 60);
