-- The colour a person picks for an account's card. Stored as an exact hex value
-- rather than a palette key, because bank and e-wallet brand colours are
-- specific values, and the palette may change without repainting old cards.
-- Null means "use the default for the account type".

alter table public.accounts add column color text
  check (color ~ '^#[0-9A-F]{6}$');
