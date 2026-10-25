import {
  budgetProgress,
  budgetsForMonth,
  budgetToInput,
  formatMoney,
  formatMonthLabel,
  formatMonthRange,
  HOME_TIME_ZONE,
  isMonth,
  monthlyLimitCents,
  monthOf,
  spendingByCategory,
  spentAgainstBudget,
  todayIn,
  type BudgetInput,
  type BudgetProgress,
  type BudgetStatus,
  type TransactionListItem,
} from "@money-manager/shared";
import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { BudgetsIcon, PlusIcon } from "@/components/icons";
import { MONEY_STYLE } from "@/components/money-style";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { buttonClassName } from "@/components/ui/button";
import { getDefaultCurrency } from "@/lib/accounts";
import { listBudgets, type BudgetWithCategory } from "@/lib/budgets";
import { listCurrencyOptions, type CurrencyOption } from "@/lib/currencies";
import { listCategories, listMonthTransactions, TRANSACTION_ROW_LIMIT } from "@/lib/transactions";
import { createBudget, deleteBudget, updateBudget } from "./actions";
import { BudgetDialog } from "./budget-dialog";
import type { BudgetCategoryOption } from "./budget-form";

export const metadata: Metadata = { title: "Budgets" };

const BUDGETS_PATH = "/budgets";

function budgetsHref(month: string): string {
  return `${BUDGETS_PATH}?${new URLSearchParams({ month })}`;
}

// cache() so the header button and the page body share one set of queries.
const loadBudgetSetup = cache(async () => {
  const [budgets, categories, defaultCurrency] = await Promise.all([
    listBudgets(),
    listCategories(),
    getDefaultCurrency(),
  ]);
  // Every expense category is a fair suggestion: one that already has an
  // ongoing budget can still take a budget for specific months.
  const expenseCategories: BudgetCategoryOption[] = categories
    .filter((category) => category.type === "expense")
    .map(({ id, name }) => ({ id, name }));
  // Built once and shared by reference, so every dialog's props reuse one list.
  return { budgets, expenseCategories, defaultCurrency, currencyOptions: listCurrencyOptions() };
});

/** A month range, if chosen, starts and ends on the month on screen. */
function blankBudget(currency: string, month: string, categoryId = ""): BudgetInput {
  return { categoryId, amount: "", currency, period: "monthly", startMonth: month, endMonth: month };
}

/** What the amount covers, for budgets that aren't simply monthly. */
function periodCaption(budget: BudgetWithCategory): string | null {
  const amount = formatMoney(budget.amountCents, budget.currency);
  if (budget.period === "yearly") return `${amount} a year`;
  if (budget.period === "range" && budget.startMonth && budget.endMonth) {
    return `${amount} for ${formatMonthRange(budget.startMonth, budget.endMonth)}`;
  }
  return null;
}

const addBudgetLabel = (
  <>
    <PlusIcon width={18} height={18} />
    Add budget
  </>
);

// Severity is carried by the fill, with the track a lighter step of the same
// colour, and always named in words too so it never rests on colour alone.
const STATUS_STYLE: Record<BudgetStatus, { fill: string; track: string; text: string }> = {
  on_track: { fill: "bg-primary", track: "bg-primary-soft", text: "text-muted" },
  near_limit: { fill: "bg-butter-ink", track: "bg-butter", text: "text-butter-ink" },
  over: { fill: "bg-danger", track: "bg-danger-soft", text: "text-danger" },
};

function statusText(progress: BudgetProgress, currency: string): string {
  if (progress.status === "over") return `Over by ${formatMoney(-progress.remainingCents, currency)}`;
  const left = `${formatMoney(progress.remainingCents, currency)} left`;
  return progress.status === "near_limit" ? `Almost there · ${left}` : left;
}

function BudgetMeter({ progress }: { progress: BudgetProgress }) {
  const style = STATUS_STYLE[progress.status];
  return (
    <span aria-hidden="true" className={`block h-2 w-full overflow-hidden rounded-full ${style.track}`}>
      <span
        className={`block h-full rounded-full ${style.fill}`}
        style={{ width: `${Math.min(progress.ratio, 1) * 100}%` }}
      />
    </span>
  );
}

interface BudgetRowData extends BudgetWithCategory {
  progress: BudgetProgress;
}

function BudgetRow({
  budget,
  month,
  currencyOptions,
}: {
  budget: BudgetRowData;
  month: string;
  currencyOptions: CurrencyOption[];
}) {
  const { progress, currency } = budget;
  const percent = Math.round(progress.ratio * 100);
  const caption = periodCaption(budget);
  return (
    <li>
      <BudgetDialog
        mode="edit"
        initial={budgetToInput(budget)}
        month={month}
        action={updateBudget.bind(null, budget.id)}
        deleteAction={deleteBudget.bind(null, budget.id)}
        categories={[{ id: budget.categoryId, name: budget.categoryName }]}
        currencyOptions={currencyOptions}
        triggerClassName="flex w-full flex-col gap-2 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary"
        trigger={
          <>
            <span className="flex w-full items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-sm">
                <span className="font-medium">{budget.categoryName}</span>
                {caption && <span className="text-xs text-muted"> · {caption}</span>}
              </span>
              <span className="shrink-0 text-sm tabular-nums">
                <span className="font-medium">{formatMoney(progress.spentCents, currency)}</span>
                <span className="text-muted"> of {formatMoney(progress.limitCents, currency)}</span>
              </span>
            </span>
            <BudgetMeter progress={progress} />
            <span className="flex w-full items-baseline justify-between gap-4 text-xs">
              <span className={`font-medium ${STATUS_STYLE[progress.status].text}`}>
                {statusText(progress, currency)}
              </span>
              <span className="text-muted tabular-nums">{percent}%</span>
            </span>
          </>
        }
      />
    </li>
  );
}

/**
 * Budgets that don't apply to the month on screen: ranges for other months,
 * and ongoing budgets a range is standing in for. Listed so they can still be
 * found and edited.
 */
function OtherBudgets({
  budgets,
  month,
  currencyOptions,
}: {
  budgets: BudgetWithCategory[];
  month: string;
  currencyOptions: CurrencyOption[];
}) {
  if (budgets.length === 0) return null;
  return (
    <Card title="Other budgets" description={`Not counted in ${formatMonthLabel(month)}`}>
      <ul className="-mx-3 flex flex-col">
        {budgets.map((budget) => (
          <li key={budget.id}>
            <BudgetDialog
              mode="edit"
              initial={budgetToInput(budget)}
              month={month}
              action={updateBudget.bind(null, budget.id)}
              deleteAction={deleteBudget.bind(null, budget.id)}
              categories={[{ id: budget.categoryId, name: budget.categoryName }]}
              currencyOptions={currencyOptions}
              triggerClassName="flex w-full items-baseline justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary"
              trigger={
                <>
                  <span className="truncate text-sm font-medium">{budget.categoryName}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {periodCaption(budget) ??
                      `${formatMoney(budget.amountCents, budget.currency)} a month · replaced this month`}
                  </span>
                </>
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface CurrencyTotals {
  currency: string;
  limitCents: number;
  spentCents: number;
}

/** Budgets in different currencies are never added together. */
function totalsByCurrency(rows: BudgetRowData[]): CurrencyTotals[] {
  const totals = new Map<string, CurrencyTotals>();
  for (const row of rows) {
    const current = totals.get(row.currency) ?? { currency: row.currency, limitCents: 0, spentCents: 0 };
    totals.set(row.currency, {
      ...current,
      limitCents: current.limitCents + row.progress.limitCents,
      spentCents: current.spentCents + row.progress.spentCents,
    });
  }
  return [...totals.values()];
}

function Summary({ rows }: { rows: BudgetRowData[] }) {
  const totals = totalsByCurrency(rows);
  const values = (pick: (total: CurrencyTotals) => number) =>
    totals.map((total) => formatMoney(pick(total), total.currency));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Budgeted" icon={BudgetsIcon} tone="cloud" values={values((t) => t.limitCents)} />
      <StatCard label="Spent" {...MONEY_STYLE.spent} values={values((t) => t.spentCents)} />
      <StatCard
        label="Left"
        {...MONEY_STYLE.held}
        values={values((t) => t.limitCents - t.spentCents)}
      />
    </div>
  );
}

interface UnbudgetedSpending {
  categoryId: string;
  categoryName: string;
  currency: string;
  cents: number;
}

/**
 * Categorised spending this month with no budget on it, largest first, so the
 * obvious next budget to set is at the top. Uncategorised spending is left
 * out: there is nothing to put a budget on.
 */
function findUnbudgetedSpending(
  transactions: TransactionListItem[],
  budgets: BudgetWithCategory[],
): UnbudgetedSpending[] {
  const budgetedIds = new Set(budgets.map((budget) => budget.categoryId));
  const currencies = [
    ...new Set(transactions.filter((t) => t.type === "expense").map((t) => t.currency)),
  ];
  return currencies
    .flatMap((currency) =>
      spendingByCategory(transactions, currency).flatMap((spending) =>
        spending.categoryId && !budgetedIds.has(spending.categoryId)
          ? [
              {
                categoryId: spending.categoryId,
                categoryName: spending.categoryName ?? "Unnamed category",
                currency,
                cents: spending.cents,
              },
            ]
          : [],
      ),
    )
    .sort((a, b) => b.cents - a.cents);
}

function UnbudgetedCard({
  spending,
  expenseCategories,
  currencyOptions,
  month,
}: {
  spending: UnbudgetedSpending[];
  expenseCategories: BudgetCategoryOption[];
  currencyOptions: CurrencyOption[];
  month: string;
}) {
  if (spending.length === 0) return null;
  return (
    <Card title="Spending without a budget" description={`Categories you spent on in ${formatMonthLabel(month)}`}>
      <ul className="divide-y divide-border">
        {spending.map((item) => (
          <li key={`${item.categoryId}-${item.currency}`} className="flex items-center justify-between gap-4 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{item.categoryName}</span>
              <span className="block text-xs text-muted tabular-nums">
                {formatMoney(item.cents, item.currency)} spent
              </span>
            </span>
            <BudgetDialog
              mode="create"
              initial={blankBudget(item.currency, month, item.categoryId)}
              month={month}
              action={createBudget}
              categories={expenseCategories}
              currencyOptions={currencyOptions}
              trigger="Set budget"
              triggerClassName={buttonClassName("secondary", "shrink-0")}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function BudgetsView({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const requested = searchParams.month;
  const currentMonth = monthOf(todayIn(HOME_TIME_ZONE));
  const month = typeof requested === "string" && isMonth(requested) ? requested : currentMonth;

  const [{ budgets, expenseCategories, defaultCurrency, currencyOptions }, transactions] =
    await Promise.all([loadBudgetSetup(), listMonthTransactions(month)]);

  const applying = budgetsForMonth(budgets, month);
  const rows: BudgetRowData[] = applying.map((budget) => ({
    ...budget,
    progress: budgetProgress(monthlyLimitCents(budget, month), spentAgainstBudget(budget, transactions)),
  }));
  const others = budgets.filter((budget) => !applying.includes(budget));
  const unbudgetedSpending = findUnbudgetedSpending(transactions, applying);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <MonthNav month={month} hrefForMonth={budgetsHref} />
        <AddBudgetAction month={month} />
      </div>
      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={BudgetsIcon}
            tone="butter"
            title="No budgets yet"
            description="Set a limit for a category, like groceries or eating out, per month, per year, or for specific months, and see how much is left as you spend."
            action={
              <BudgetDialog
                mode="create"
                initial={blankBudget(defaultCurrency, month)}
                month={month}
                action={createBudget}
                categories={expenseCategories}
                currencyOptions={currencyOptions}
                trigger={addBudgetLabel}
                triggerClassName={buttonClassName("primary")}
              />
            }
          />
        </Card>
      ) : (
        <>
          <Summary rows={rows} />
          <Card
            title="Your budgets"
            description={`Spending in ${formatMonthLabel(month)}. Yearly and multi-month budgets count an equal share each month.`}
          >
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                No budget covers {formatMonthLabel(month)}.
              </p>
            ) : (
              <ul className="-mx-3 flex flex-col">
                {rows.map((row) => (
                  <BudgetRow key={row.id} budget={row} month={month} currencyOptions={currencyOptions} />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
      <UnbudgetedCard
        spending={unbudgetedSpending}
        expenseCategories={expenseCategories}
        currencyOptions={currencyOptions}
        month={month}
      />
      <OtherBudgets budgets={others} month={month} currencyOptions={currencyOptions} />
      {transactions.length === TRANSACTION_ROW_LIMIT && (
        <p className="text-xs text-muted">
          This month has more than {TRANSACTION_ROW_LIMIT} transactions, so some spending isn&apos;t
          counted here.
        </p>
      )}
    </div>
  );
}

async function AddBudgetAction({ month }: { month: string }) {
  const { expenseCategories, defaultCurrency, currencyOptions } = await loadBudgetSetup();
  return (
    <BudgetDialog
      mode="create"
      initial={blankBudget(defaultCurrency, month)}
      month={month}
      action={createBudget}
      categories={expenseCategories}
      currencyOptions={currencyOptions}
      trigger={addBudgetLabel}
      triggerClassName={buttonClassName("primary")}
    />
  );
}

function BudgetsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="h-9 w-56 animate-pulse rounded-xl bg-surface-sunken" />
        <button type="button" disabled className={buttonClassName("primary")}>
          {addBudgetLabel}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-16 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface" />
    </div>
  );
}

export default function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  return (
    <>
      <PageHeader title="Budgets" description="Monthly spending limits by category." />
      {/* searchParams is request-time data under Cache Components, so it is
          awaited inside the boundary rather than by the page. */}
      <Suspense fallback={<BudgetsSkeleton />}>
        {searchParams.then((params) => (
          <BudgetsView searchParams={params} />
        ))}
      </Suspense>
    </>
  );
}
