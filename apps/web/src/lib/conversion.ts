import { convertItems, type ExchangeRates, type TransactionListItem } from "@money-manager/shared";
import type { AccountWithBalance } from "@/lib/accounts";

/** Balances in the default currency, for totals; cards and lists keep each account's own currency. */
export function convertAccountBalances(accounts: readonly AccountWithBalance[], rates: ExchangeRates | null) {
  return convertItems(accounts, rates, (account, toTarget) => ({
    ...account,
    balanceCents: toTarget(account.balanceCents),
    openingBalanceCents: toTarget(account.openingBalanceCents),
    setAsideCents: toTarget(account.setAsideCents),
  }));
}

/** Transaction amounts in the default currency, for totals and charts; lists keep each row's own. */
export function convertTransactionAmounts(
  transactions: readonly TransactionListItem[],
  rates: ExchangeRates | null,
) {
  return convertItems(transactions, rates, (transaction, toTarget) => ({
    ...transaction,
    amountCents: toTarget(transaction.amountCents),
  }));
}

/** Plain per-currency amounts (budget left, utang outstanding) in the default currency, for totals. */
export function convertAmounts<T extends { currency: string; cents: number }>(
  amounts: readonly T[],
  rates: ExchangeRates | null,
) {
  return convertItems(amounts, rates, (amount, toTarget) => ({ ...amount, cents: toTarget(amount.cents) }));
}
