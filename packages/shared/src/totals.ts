import { isLiabilityAccount, type AccountType } from "./accounts";
import { monthOf } from "./dates";
import type { TransactionListItem } from "./transaction-filters";

type Amounted = Pick<TransactionListItem, "type" | "amountCents" | "currency">;

export interface CashFlow {
  currency: string;
  incomeCents: number;
  /** Positive: how much was spent. */
  expenseCents: number;
}

/**
 * Income and spending, one entry per currency in order of first appearance.
 * Transfers move money between the person's own accounts without earning or
 * spending it, so they are left out.
 */
export function cashFlowByCurrency(transactions: readonly Amounted[]): CashFlow[] {
  const totals = new Map<string, CashFlow>();
  for (const transaction of transactions) {
    if (transaction.type === "transfer") continue;
    const current = totals.get(transaction.currency) ?? {
      currency: transaction.currency,
      incomeCents: 0,
      expenseCents: 0,
    };
    totals.set(transaction.currency, {
      ...current,
      incomeCents: current.incomeCents + (transaction.type === "income" ? transaction.amountCents : 0),
      expenseCents: current.expenseCents + (transaction.type === "expense" ? transaction.amountCents : 0),
    });
  }
  return [...totals.values()];
}

export interface MonthCashFlow {
  /** YYYY-MM. */
  month: string;
  incomeCents: number;
  expenseCents: number;
}

/** Income and spending in one currency for each of `months`, zero where nothing happened. */
export function cashFlowByMonth(
  transactions: readonly (Amounted & Pick<TransactionListItem, "occurredOn">)[],
  months: readonly string[],
  currency: string,
): MonthCashFlow[] {
  return months.map((month) => {
    const inMonth = transactions.filter(
      (transaction) => transaction.currency === currency && monthOf(transaction.occurredOn) === month,
    );
    const [flow] = cashFlowByCurrency(inMonth);
    return { month, incomeCents: flow?.incomeCents ?? 0, expenseCents: flow?.expenseCents ?? 0 };
  });
}

export interface CategorySpending {
  /** null for uncategorised spending. */
  categoryId: string | null;
  categoryName: string | null;
  cents: number;
}

/** Expenses in one currency grouped by category, largest first. */
export function spendingByCategory(
  transactions: readonly (Amounted & Pick<TransactionListItem, "categoryId" | "categoryName">)[],
  currency: string,
): CategorySpending[] {
  const byCategory = new Map<string | null, CategorySpending>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense" || transaction.currency !== currency) continue;
    const current = byCategory.get(transaction.categoryId) ?? {
      categoryId: transaction.categoryId,
      categoryName: transaction.categoryName,
      cents: 0,
    };
    byCategory.set(transaction.categoryId, { ...current, cents: current.cents + transaction.amountCents });
  }
  return [...byCategory.values()].sort((a, b) => b.cents - a.cents);
}

export interface NetWorth {
  currency: string;
  /** Everything held, including credit cards that are in credit. */
  haveCents: number;
  /** Positive: what is owed on credit cards. */
  owedCents: number;
  netCents: number;
  hasCreditCards: boolean;
}

interface BalancedAccount {
  type: AccountType;
  currency: string;
  /** Signed: a credit card that is owed money is negative. */
  balanceCents: number;
}

/** What the person has, owes, and is worth, separately for each currency. */
export function netWorthByCurrency(accounts: readonly BalancedAccount[]): NetWorth[] {
  const byCurrency = new Map<string, NetWorth>();
  for (const account of accounts) {
    const current = byCurrency.get(account.currency) ?? {
      currency: account.currency,
      haveCents: 0,
      owedCents: 0,
      netCents: 0,
      hasCreditCards: false,
    };
    const isOwing = isLiabilityAccount(account.type) && account.balanceCents < 0;
    byCurrency.set(account.currency, {
      ...current,
      haveCents: current.haveCents + (isOwing ? 0 : account.balanceCents),
      owedCents: current.owedCents + (isOwing ? -account.balanceCents : 0),
      netCents: current.netCents + account.balanceCents,
      hasCreditCards: current.hasCreditCards || isLiabilityAccount(account.type),
    });
  }
  return [...byCurrency.values()];
}

/**
 * The one currency a single-currency chart should use: the person's default
 * when it has any of `currencies`, otherwise whichever appears first. Null
 * when there is nothing to chart.
 */
export function chartCurrency(currencies: readonly string[], defaultCurrency: string): string | null {
  if (currencies.includes(defaultCurrency)) return defaultCurrency;
  return currencies[0] ?? null;
}
