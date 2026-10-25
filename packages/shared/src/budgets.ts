import { isMonth, monthsBetween } from "./dates";
import { isUuid } from "./ids";
import {
  centsToAmountInput,
  isCurrencyCode,
  MAX_AMOUNT_TEXT,
  parseAmountToCents,
} from "./money";
import type { TransactionListItem } from "./transaction-filters";

/** In the order the form offers them. Mirrors the budgets.period CHECK constraint. */
export const BUDGET_PERIODS = ["monthly", "yearly", "range"] as const;

export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, { option: string; limit: string }> = {
  monthly: { option: "Per month", limit: "Monthly limit" },
  yearly: { option: "Per year", limit: "Yearly limit" },
  range: { option: "Specific months", limit: "Total for these months" },
};

export function isBudgetPeriod(value: unknown): value is BudgetPeriod {
  return typeof value === "string" && (BUDGET_PERIODS as readonly string[]).includes(value);
}

/** What the add and edit budget forms send, before any of it is trusted. */
export interface BudgetInput {
  categoryId: string;
  amount: string;
  currency: string;
  period: string;
  /** YYYY-MM; only read for "range" budgets. */
  startMonth: string;
  /** YYYY-MM, inclusive; only read for "range" budgets. */
  endMonth: string;
}

export interface ValidBudget {
  categoryId: string;
  /** The limit for the whole period: a month, a year, or the range; always positive. */
  amountCents: number;
  currency: string;
  period: BudgetPeriod;
  /** YYYY-MM for "range" budgets, null otherwise. */
  startMonth: string | null;
  /** YYYY-MM, inclusive, for "range" budgets, null otherwise. */
  endMonth: string | null;
}

export type BudgetInputResult = { ok: true; budget: ValidBudget } | { ok: false; error: string };

/** Everything about a budget except which category it is on. */
export type BudgetLimitInput = Omit<BudgetInput, "categoryId">;
export type ValidBudgetLimit = Omit<ValidBudget, "categoryId">;
export type BudgetLimitResult = { ok: true; limit: ValidBudgetLimit } | { ok: false; error: string };

type MonthsResult =
  | { ok: true; startMonth: string | null; endMonth: string | null }
  | { ok: false; error: string };

function validateMonths(period: BudgetPeriod, startText: string, endText: string): MonthsResult {
  if (period !== "range") return { ok: true, startMonth: null, endMonth: null };
  const startMonth = startText.trim();
  const endMonth = endText.trim();
  if (!isMonth(startMonth) || !isMonth(endMonth)) {
    return { ok: false, error: "Choose the first and last month." };
  }
  if (endMonth < startMonth) {
    return { ok: false, error: "The last month can't come before the first." };
  }
  return { ok: true, startMonth, endMonth };
}

/**
 * Checks a budget's period, months, amount, and currency. Separate from the
 * category so a form that names a new category can be checked before
 * creating it.
 */
export function validateBudgetLimit(input: BudgetLimitInput): BudgetLimitResult {
  const amountText = input.amount.trim();
  const currency = input.currency.trim().toUpperCase();

  if (!isBudgetPeriod(input.period)) return { ok: false, error: "Choose how long the budget runs." };
  const months = validateMonths(input.period, input.startMonth, input.endMonth);
  if (!months.ok) return months;
  if (!amountText) return { ok: false, error: "Enter a limit." };

  const amount = parseAmountToCents(amountText);
  if (!amount.ok) {
    return {
      ok: false,
      error:
        amount.reason === "too_large"
          ? `That's more than the largest amount we can store (${MAX_AMOUNT_TEXT}).`
          : "Enter the limit as a number, like 5,000.",
    };
  }
  if (amount.cents === 0) return { ok: false, error: "The limit has to be more than zero." };
  if (!isCurrencyCode(currency)) return { ok: false, error: "Choose a currency from the list." };

  return {
    ok: true,
    limit: {
      amountCents: amount.cents,
      currency,
      period: input.period,
      startMonth: months.startMonth,
      endMonth: months.endMonth,
    },
  };
}

/**
 * Checks the shape of a budget. Whether the category belongs to the person and
 * is an expense category is the database's to answer, so callers check that.
 */
export function validateBudgetInput(input: BudgetInput): BudgetInputResult {
  // Lowercased to match how Postgres returns uuids.
  const categoryId = input.categoryId.trim().toLowerCase();
  if (!isUuid(categoryId)) return { ok: false, error: "Choose a category." };

  const result = validateBudgetLimit(input);
  if (!result.ok) return result;
  return { ok: true, budget: { categoryId, ...result.limit } };
}

/** A saved budget as the form fields that would recreate it, for prefilling the edit form. */
export function budgetToInput(budget: ValidBudget): BudgetInput {
  return {
    categoryId: budget.categoryId,
    amount: centsToAmountInput(budget.amountCents),
    currency: budget.currency,
    period: budget.period,
    startMonth: budget.startMonth ?? "",
    endMonth: budget.endMonth ?? "",
  };
}

type Scheduled = Pick<ValidBudget, "amountCents" | "period" | "startMonth" | "endMonth">;

/** Whether a budget covers a month (YYYY-MM): ongoing ones always do, ranges only inside their span. */
export function budgetCoversMonth(budget: Scheduled, month: string): boolean {
  if (budget.period !== "range") return true;
  return (
    budget.startMonth !== null &&
    budget.endMonth !== null &&
    month >= budget.startMonth &&
    month <= budget.endMonth
  );
}

/** Splits `totalCents` into `parts` whole-cent shares, the first ones a cent larger, summing exactly. */
function evenShare(totalCents: number, parts: number, index: number): number {
  const share = Math.floor(totalCents / parts);
  return index < totalCents % parts ? share + 1 : share;
}

/**
 * The limit that applies to one month (YYYY-MM), or 0 for a month the budget
 * doesn't cover. Yearly and range amounts are shared evenly across their
 * months, with any leftover cents going to the earliest, so the shares add
 * back up to exactly the amount set.
 */
export function monthlyLimitCents(budget: Scheduled, month: string): number {
  if (!budgetCoversMonth(budget, month)) return 0;
  if (budget.period === "monthly") return budget.amountCents;
  if (budget.period === "yearly") return evenShare(budget.amountCents, 12, Number(month.slice(5, 7)) - 1);
  // budgetCoversMonth has confirmed both ends are set for a range.
  const start = budget.startMonth ?? month;
  const end = budget.endMonth ?? month;
  return evenShare(budget.amountCents, monthsBetween(start, end) + 1, monthsBetween(start, month));
}

/**
 * The budget each category is held to in `month`: a range covering the month
 * takes priority over the category's ongoing budget, which it stands in for.
 * Categories with nothing covering the month are left out.
 */
export function budgetsForMonth<T extends Scheduled & { categoryId: string }>(
  budgets: readonly T[],
  month: string,
): T[] {
  const chosen = new Map<string, T>();
  for (const budget of budgets) {
    if (!budgetCoversMonth(budget, month)) continue;
    const current = chosen.get(budget.categoryId);
    if (!current || (budget.period === "range" && current.period !== "range")) {
      chosen.set(budget.categoryId, budget);
    }
  }
  return [...chosen.values()];
}

/** Spending at or past this share of the limit counts as "almost there". */
export const BUDGET_WARNING_RATIO = 0.8;

export type BudgetStatus = "on_track" | "near_limit" | "over";

export interface BudgetProgress {
  spentCents: number;
  limitCents: number;
  /** Negative once the limit is passed. */
  remainingCents: number;
  /** spent ÷ limit; above 1 once over. */
  ratio: number;
  status: BudgetStatus;
}

export function budgetProgress(limitCents: number, spentCents: number): BudgetProgress {
  const ratio = limitCents > 0 ? spentCents / limitCents : 0;
  const status: BudgetStatus =
    spentCents > limitCents ? "over" : ratio >= BUDGET_WARNING_RATIO ? "near_limit" : "on_track";
  return { spentCents, limitCents, remainingCents: limitCents - spentCents, ratio, status };
}

type Spending = Pick<TransactionListItem, "type" | "amountCents" | "currency" | "categoryId">;

/**
 * What a budget's category has spent, counting only expenses in the budget's
 * own currency: amounts in other currencies can't be added without a rate.
 */
export function spentAgainstBudget(
  budget: Pick<ValidBudget, "categoryId" | "currency">,
  transactions: readonly Spending[],
): number {
  return transactions.reduce(
    (total, transaction) =>
      transaction.type === "expense" &&
      transaction.categoryId === budget.categoryId &&
      transaction.currency === budget.currency
        ? total + transaction.amountCents
        : total,
    0,
  );
}
