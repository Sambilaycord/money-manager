// How every figure fits together, per currency:
//
//   in your accounts − set aside − still budgeted this month = free to spend
//   in your accounts − card debt + owed to you − you owe     = net worth
//
// Amounts in different currencies are never added together.

import { isLiabilityAccount, type AccountType } from "./accounts";
import {
  budgetsForMonth,
  monthlyLimitCents,
  spentAgainstBudget,
  type ValidBudget,
} from "./budgets";
import type { TransactionListItem } from "./transaction-filters";
import type { UtangDirection } from "./utang";

export interface CurrencyAmount {
  currency: string;
  cents: number;
}

type BudgetForMonth = Pick<
  ValidBudget,
  "categoryId" | "currency" | "amountCents" | "period" | "startMonth" | "endMonth"
>;

/**
 * What this month's budgets still have to spend, per currency: each budget's
 * limit less what its category has spent, never below zero, since an
 * overspent budget doesn't free up money elsewhere.
 */
export function budgetLeftByCurrency(
  budgets: readonly BudgetForMonth[],
  transactions: readonly Pick<TransactionListItem, "type" | "amountCents" | "currency" | "categoryId">[],
  month: string,
): CurrencyAmount[] {
  const left = new Map<string, number>();
  for (const budget of budgetsForMonth(budgets, month)) {
    const remaining = monthlyLimitCents(budget, month) - spentAgainstBudget(budget, transactions);
    left.set(budget.currency, (left.get(budget.currency) ?? 0) + Math.max(remaining, 0));
  }
  return [...left].map(([currency, cents]) => ({ currency, cents }));
}

export interface MoneyPicture {
  currency: string;
  /** Money held in accounts, including cards that are in credit. */
  heldCents: number;
  /** Reserved in accounts for wishlist items and paying back utang. */
  setAsideCents: number;
  /** What this month's budgets still have to spend. */
  budgetLeftCents: number;
  /** Held, less what's set aside and still budgeted. Negative means plans exceed the money. */
  freeToSpendCents: number;
  /** Positive: what's owed on credit cards. */
  cardDebtCents: number;
  /** Utang still owed to the person. */
  owedToYouCents: number;
  /** Utang the person still owes. */
  youOweCents: number;
  /** Held − card debt + owed to you − you owe. */
  netWorthCents: number;
}

interface PictureAccount {
  type: AccountType;
  currency: string;
  /** Signed: a card that is owed money is negative. */
  balanceCents: number;
  setAsideCents: number;
}

interface PictureUtang {
  direction: UtangDirection;
  currency: string;
  remainingCents: number;
}

function emptyPicture(currency: string): MoneyPicture {
  return {
    currency,
    heldCents: 0,
    setAsideCents: 0,
    budgetLeftCents: 0,
    freeToSpendCents: 0,
    cardDebtCents: 0,
    owedToYouCents: 0,
    youOweCents: 0,
    netWorthCents: 0,
  };
}

/** The whole picture per currency, in order of first appearance (accounts first). */
export function moneyPictureByCurrency(sources: {
  accounts: readonly PictureAccount[];
  budgetLeft: readonly CurrencyAmount[];
  utang: readonly PictureUtang[];
}): MoneyPicture[] {
  const pictures = new Map<string, MoneyPicture>();
  const pictureFor = (currency: string) => {
    const existing = pictures.get(currency);
    if (existing) return existing;
    const created = emptyPicture(currency);
    pictures.set(currency, created);
    return created;
  };

  for (const account of sources.accounts) {
    const picture = pictureFor(account.currency);
    const isOwing = isLiabilityAccount(account.type) && account.balanceCents < 0;
    if (isOwing) picture.cardDebtCents += -account.balanceCents;
    else picture.heldCents += account.balanceCents;
    picture.setAsideCents += account.setAsideCents;
  }
  for (const budget of sources.budgetLeft) pictureFor(budget.currency).budgetLeftCents += budget.cents;
  for (const item of sources.utang) {
    const picture = pictureFor(item.currency);
    if (item.direction === "owed_to_me") picture.owedToYouCents += item.remainingCents;
    else picture.youOweCents += item.remainingCents;
  }

  return [...pictures.values()].map((picture) => ({
    ...picture,
    freeToSpendCents: picture.heldCents - picture.setAsideCents - picture.budgetLeftCents,
    netWorthCents:
      picture.heldCents - picture.cardDebtCents + picture.owedToYouCents - picture.youOweCents,
  }));
}

/** What can still be set aside or spent from one account: its balance less what's already reserved. */
export function availableCents(account: { balanceCents: number; setAsideCents: number }): number {
  return account.balanceCents - account.setAsideCents;
}
