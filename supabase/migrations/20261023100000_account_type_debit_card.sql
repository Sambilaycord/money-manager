-- Debit cards are tracked as their own account type, separate from the bank
-- account behind them, so people can group "the cards in my wallet" apart from
-- their savings and current accounts.

alter table public.accounts drop constraint accounts_type_check;

alter table public.accounts add constraint accounts_type_check
  check (type in ('cash', 'bank', 'debit_card', 'e_wallet', 'credit_card', 'savings', 'investment', 'other'));
