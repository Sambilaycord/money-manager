// Money set aside in an account for one purpose. Mirrors the set_asides table.

import { isUuid } from "./ids";
import { formatMoney } from "./money";
import { validateAmount } from "./transactions";

export interface SetAsideInput {
  accountId: string;
  amount: string;
}

export interface ValidSetAside {
  accountId: string;
  amountCents: number;
}

export type SetAsideResult = { ok: true; setAside: ValidSetAside } | { ok: false; error: string };

/**
 * Checks a set-aside against what's free in the chosen account, so nobody
 * reserves money they don't have. The database enforces the same limit.
 */
export function validateSetAside(
  input: SetAsideInput,
  account: { availableCents: number; currency: string } | null,
): SetAsideResult {
  const accountId = input.accountId.trim().toLowerCase();
  if (!isUuid(accountId) || account === null) {
    return { ok: false, error: "Choose an account to set the money aside in." };
  }
  const amount = validateAmount(input.amount.trim());
  if (!amount.ok) return amount;
  if (amount.cents > account.availableCents) {
    return {
      ok: false,
      error:
        account.availableCents > 0
          ? `Only ${formatMoney(account.availableCents, account.currency)} is free in that account.`
          : "That account has nothing free to set aside.",
    };
  }
  return { ok: true, setAside: { accountId, amountCents: amount.cents } };
}
