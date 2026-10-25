import { monthOf, monthRange, monthsEndingWith, shiftDate } from "./dates";
import { formatMoney } from "./money";
import type { TransactionListItem } from "./transaction-filters";

/** What the reports read from each transaction; all amounts in one currency. */
export type ReportTransaction = Pick<
  TransactionListItem,
  "id" | "type" | "amountCents" | "occurredOn" | "categoryId" | "categoryName" | "accountId" | "accountName" | "note"
>;

export const REPORT_RANGES = [3, 6, 12] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];
export const DEFAULT_REPORT_RANGE: ReportRange = 6;

/** A ?months= value from the URL, or the default when it's missing or not offered. */
export function parseReportRange(value: unknown): ReportRange {
  const months = Number(value);
  return REPORT_RANGES.find((range) => range === months) ?? DEFAULT_REPORT_RANGE;
}

export interface ReportPeriod {
  /** Oldest first, YYYY-MM; the last is the current, unfinished month. */
  months: string[];
  /** YYYY-MM-DD, inclusive. */
  start: string;
  end: string;
  days: number;
  /**
   * The same number of days immediately before, for "vs previous period".
   * Equal lengths keep the comparison fair even though the current month
   * isn't over yet.
   */
  previous: { start: string; end: string };
}

function dayNumber(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Days from `start` to `end`, counting both. */
export function daysInclusive(start: string, end: string): number {
  return dayNumber(end) - dayNumber(start) + 1;
}

export function reportPeriod(today: string, range: ReportRange): ReportPeriod {
  const months = monthsEndingWith(monthOf(today), range);
  const start = monthRange(months[0] ?? monthOf(today)).start;
  const days = daysInclusive(start, today);
  const previousEnd = shiftDate(start, -1);
  return { months, start, end: today, days, previous: { start: shiftDate(start, -days), end: previousEnd } };
}

export function isWithin(date: string, range: { start: string; end: string }): boolean {
  return date >= range.start && date <= range.end;
}

export interface PeriodTotals {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  /** Share of income kept, -1..1; null with no income to measure against. */
  savingsRate: number | null;
  /** Income and expense transactions; transfers move money, they don't earn or spend it. */
  count: number;
}

export function periodTotals(transactions: readonly ReportTransaction[]): PeriodTotals {
  let incomeCents = 0;
  let expenseCents = 0;
  let count = 0;
  for (const transaction of transactions) {
    if (transaction.type === "income") incomeCents += transaction.amountCents;
    else if (transaction.type === "expense") expenseCents += transaction.amountCents;
    else continue;
    count += 1;
  }
  const netCents = incomeCents - expenseCents;
  return {
    incomeCents,
    expenseCents,
    netCents,
    savingsRate: incomeCents > 0 ? netCents / incomeCents : null,
    count,
  };
}

/** Relative change, e.g. 0.25 for +25%. Null when there's no earlier figure to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export interface MonthReport {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  savingsRate: number | null;
  /** Net savings from the start of the period through this month. */
  cumulativeNetCents: number;
}

export function monthlyReport(transactions: readonly ReportTransaction[], months: readonly string[]): MonthReport[] {
  let cumulative = 0;
  return months.map((month) => {
    const totals = periodTotals(transactions.filter((transaction) => monthOf(transaction.occurredOn) === month));
    cumulative += totals.netCents;
    return {
      month,
      incomeCents: totals.incomeCents,
      expenseCents: totals.expenseCents,
      netCents: totals.netCents,
      savingsRate: totals.savingsRate,
      cumulativeNetCents: cumulative,
    };
  });
}

export interface CategoryTotal {
  /** null for uncategorised. */
  categoryId: string | null;
  categoryName: string | null;
  cents: number;
}

/** Income or spending grouped by category, largest first. */
export function totalsByCategory(
  transactions: readonly ReportTransaction[],
  type: "income" | "expense",
): CategoryTotal[] {
  const byCategory = new Map<string | null, CategoryTotal>();
  for (const transaction of transactions) {
    if (transaction.type !== type) continue;
    const current = byCategory.get(transaction.categoryId) ?? {
      categoryId: transaction.categoryId,
      categoryName: transaction.categoryName,
      cents: 0,
    };
    byCategory.set(transaction.categoryId, { ...current, cents: current.cents + transaction.amountCents });
  }
  return [...byCategory.values()].sort((a, b) => b.cents - a.cents);
}

export interface CategoryTrend extends CategoryTotal {
  previousCents: number;
  change: number | null;
  /** Share of all spending in the current period, 0..1. */
  share: number;
  /** Spending in each month of the period, oldest first. */
  monthly: number[];
}

/**
 * Each expense category this period against the same-length period before,
 * with its month-by-month line. Categories that only appeared before are kept
 * (at zero now), since "stopped spending on X" is worth seeing too.
 */
export function categoryTrends(
  current: readonly ReportTransaction[],
  previous: readonly ReportTransaction[],
  months: readonly string[],
): CategoryTrend[] {
  const now = totalsByCategory(current, "expense");
  const before = new Map(totalsByCategory(previous, "expense").map((total) => [total.categoryId, total]));
  const totalCents = now.reduce((sum, total) => sum + total.cents, 0);

  const categories = new Map<string | null, CategoryTotal>(now.map((total) => [total.categoryId, total]));
  for (const [id, total] of before) if (!categories.has(id)) categories.set(id, { ...total, cents: 0 });

  return [...categories.values()]
    .map((total) => {
      const previousCents = before.get(total.categoryId)?.cents ?? 0;
      const monthly = months.map((month) =>
        current
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              transaction.categoryId === total.categoryId &&
              monthOf(transaction.occurredOn) === month,
          )
          .reduce((sum, transaction) => sum + transaction.amountCents, 0),
      );
      return {
        ...total,
        previousCents,
        change: percentChange(total.cents, previousCents),
        share: totalCents > 0 ? total.cents / totalCents : 0,
        monthly,
      };
    })
    .sort((a, b) => b.cents - a.cents || b.previousCents - a.previousCents);
}

export interface AccountSpending {
  accountId: string;
  accountName: string;
  cents: number;
}

export function spendingByAccount(transactions: readonly ReportTransaction[]): AccountSpending[] {
  const byAccount = new Map<string, AccountSpending>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    const current = byAccount.get(transaction.accountId) ?? {
      accountId: transaction.accountId,
      accountName: transaction.accountName,
      cents: 0,
    };
    byAccount.set(transaction.accountId, { ...current, cents: current.cents + transaction.amountCents });
  }
  return [...byAccount.values()].sort((a, b) => b.cents - a.cents);
}

/** Monday first, as people in the Philippines read a week; numbers match Date.getUTCDay. */
const WEEK = [
  { weekday: 1, label: "Mon", name: "Monday" },
  { weekday: 2, label: "Tue", name: "Tuesday" },
  { weekday: 3, label: "Wed", name: "Wednesday" },
  { weekday: 4, label: "Thu", name: "Thursday" },
  { weekday: 5, label: "Fri", name: "Friday" },
  { weekday: 6, label: "Sat", name: "Saturday" },
  { weekday: 0, label: "Sun", name: "Sunday" },
] as const;

export interface WeekdaySpending {
  /** 0 = Sunday, as Date.getUTCDay. */
  weekday: number;
  label: (typeof WEEK)[number]["label"];
  /** The full name, for sentences: "Friday". */
  name: (typeof WEEK)[number]["name"];
  totalCents: number;
  /** Total divided by how many of that weekday the period contains. */
  averageCents: number;
}

function weekdayOf(date: string): number {
  return new Date(dayNumber(date) * 86_400_000).getUTCDay();
}

function countBy<T>(items: Iterable<T>, keyOf: (item: T) => number, amountOf: (item: T) => number) {
  const totals = new Map<number, number>();
  for (const item of items) totals.set(keyOf(item), (totals.get(keyOf(item)) ?? 0) + amountOf(item));
  return totals;
}

/** Spending per day of the week, Monday first, averaged over the days in the period. */
export function spendingByWeekday(
  transactions: readonly ReportTransaction[],
  period: { start: string; end: string },
): WeekdaySpending[] {
  const totals = countBy(
    transactions.filter((transaction) => transaction.type === "expense"),
    (transaction) => weekdayOf(transaction.occurredOn),
    (transaction) => transaction.amountCents,
  );
  const days = Array.from({ length: daysInclusive(period.start, period.end) }, (_, offset) =>
    shiftDate(period.start, offset),
  );
  const occurrences = countBy(days, weekdayOf, () => 1);

  return WEEK.map(({ weekday, label, name }) => {
    const totalCents = totals.get(weekday) ?? 0;
    const count = occurrences.get(weekday) ?? 0;
    return { weekday, label, name, totalCents, averageCents: count > 0 ? Math.round(totalCents / count) : 0 };
  });
}

/** The largest single expenses, biggest first. */
export function largestExpenses(transactions: readonly ReportTransaction[], count: number): ReportTransaction[] {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .sort((a, b) => b.amountCents - a.amountCents || b.occurredOn.localeCompare(a.occurredOn))
    .slice(0, count);
}

export type InsightTone = "good" | "bad" | "neutral";

export interface Insight {
  tone: InsightTone;
  text: string;
}

function percentText(change: number): string {
  return `${Math.round(Math.abs(change) * 100)}%`;
}

const monthName = (month: string) =>
  new Intl.DateTimeFormat("en-PH", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

interface InsightInput {
  currency: string;
  current: PeriodTotals;
  previous: PeriodTotals;
  months: readonly MonthReport[];
  trends: readonly CategoryTrend[];
  weekdays: readonly WeekdaySpending[];
  largest: ReportTransaction | undefined;
}

/**
 * Plain-language findings, most important first. Each is only produced when
 * the data supports it, so a quiet period gives fewer, not vaguer, insights.
 */
export function buildInsights(input: InsightInput): Insight[] {
  const { currency, current, previous, months, trends, weekdays, largest } = input;
  const money = (cents: number) => formatMoney(cents, currency);
  const insights: Insight[] = [];

  const spendingChange = percentChange(current.expenseCents, previous.expenseCents);
  if (spendingChange !== null && Math.abs(spendingChange) >= 0.05) {
    const driver = [...trends]
      .map((trend) => ({ trend, delta: trend.cents - trend.previousCents }))
      .sort((a, b) => (spendingChange > 0 ? b.delta - a.delta : a.delta - b.delta))[0];
    const drivenBy =
      driver && Math.sign(driver.delta) === Math.sign(spendingChange) && driver.delta !== 0
        ? `, mostly ${driver.trend.categoryName ?? "uncategorised spending"} (${driver.delta > 0 ? "+" : "−"}${money(Math.abs(driver.delta))})`
        : "";
    insights.push({
      tone: spendingChange > 0 ? "bad" : "good",
      text: `Spending is ${spendingChange > 0 ? "up" : "down"} ${percentText(spendingChange)} on the previous period${drivenBy}.`,
    });
  }

  const incomeChange = percentChange(current.incomeCents, previous.incomeCents);
  if (incomeChange !== null && Math.abs(incomeChange) >= 0.05) {
    insights.push({
      tone: incomeChange > 0 ? "good" : "bad",
      text: `Income is ${incomeChange > 0 ? "up" : "down"} ${percentText(incomeChange)} on the previous period.`,
    });
  }

  if (current.savingsRate !== null) {
    insights.push(
      current.savingsRate >= 0
        ? {
            tone: current.savingsRate >= 0.2 ? "good" : "neutral",
            text: `You kept ${percentText(current.savingsRate)} of your income (${money(current.netCents)}).`,
          }
        : {
            tone: "bad",
            text: `You spent ${money(-current.netCents)} more than you earned.`,
          },
    );
  }

  const spendingMonths = months.filter((month) => month.expenseCents > 0);
  if (spendingMonths.length >= 2) {
    const highest = spendingMonths.reduce((a, b) => (b.expenseCents > a.expenseCents ? b : a));
    insights.push({
      tone: "neutral",
      text: `${monthName(highest.month)} was your highest-spending month at ${money(highest.expenseCents)}.`,
    });
  }

  const [topCategory] = trends;
  if (topCategory && topCategory.cents > 0) {
    insights.push({
      tone: "neutral",
      text: `${topCategory.categoryName ?? "Uncategorised spending"} is your biggest expense at ${percentText(topCategory.share)} of spending.`,
    });
  }

  const busiest = weekdays.reduce<WeekdaySpending | undefined>(
    (best, day) => (day.averageCents > (best?.averageCents ?? 0) ? day : best),
    undefined,
  );
  if (busiest) {
    insights.push({
      tone: "neutral",
      text: `You spend the most on ${busiest.name}s, about ${money(busiest.averageCents)} on average.`,
    });
  }

  if (largest) {
    const what = largest.note || largest.categoryName || "an expense";
    insights.push({
      tone: "neutral",
      text: `Your largest single expense was ${what} at ${money(largest.amountCents)}.`,
    });
  }

  return insights;
}
