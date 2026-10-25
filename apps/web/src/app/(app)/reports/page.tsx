import {
  buildInsights,
  categoryTrends,
  chartCurrency,
  formatDayWithYear,
  formatMoney,
  formatMonthLabel,
  formatMonthShort,
  HOME_TIME_ZONE,
  isWithin,
  largestExpenses,
  monthlyReport,
  parseReportRange,
  percentChange,
  periodTotals,
  REPORT_RANGES,
  reportPeriod,
  spendingByAccount,
  spendingByWeekday,
  todayIn,
  totalsByCategory,
  type CategoryTrend,
  type Insight,
  type MonthReport,
  type ReportRange,
  type ReportTransaction,
} from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Card } from "@/components/card";
import { ChangeBadge } from "@/components/change-badge";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { CashFlowTrend } from "@/components/charts/cash-flow-trend";
import { ColumnChart } from "@/components/charts/column-chart";
import { RankedBars } from "@/components/charts/ranked-bars";
import { SavingsLineChart } from "@/components/charts/savings-line-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { approximate, ConversionNote } from "@/components/conversion-note";
import { EmptyState } from "@/components/empty-state";
import { AlertIcon, CheckIcon, InfoIcon, ReportsIcon, TrendIcon } from "@/components/icons";
import { MONEY_STYLE } from "@/components/money-style";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getDefaultCurrency } from "@/lib/accounts";
import { convertTransactionAmounts } from "@/lib/conversion";
import { getExchangeRates } from "@/lib/exchange-rates";
import { listTransactionsBetween, TRANSACTION_ROW_LIMIT } from "@/lib/transactions";

export const metadata: Metadata = { title: "Reports" };

const LARGEST_SHOWN = 5;

function rangeLabel(range: ReportRange): string {
  return `${range} months`;
}

function RangeFilter({ selected }: { selected: ReportRange }) {
  return (
    <nav aria-label="Report period" className="mb-6 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-muted">Period</span>
      {REPORT_RANGES.map((range) => (
        <Link
          key={range}
          href={`/reports?months=${range}`}
          aria-current={range === selected ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            range === selected
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          Last {rangeLabel(range)}
        </Link>
      ))}
    </nav>
  );
}

function percentText(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

/** Savings rate moves in percentage points, which a relative % change would misstate. */
function RateChange({ current, previous, comparedWith }: { current: number | null; previous: number | null; comparedWith: string }) {
  if (current === null || previous === null) {
    return <p className="truncate text-xs text-muted">No earlier data to compare</p>;
  }
  const points = Math.round((current - previous) * 100);
  if (points === 0) return <p className="truncate text-xs text-muted">No change vs {comparedWith}</p>;
  return (
    <p className="truncate text-xs">
      <span className={`font-medium ${points > 0 ? "text-income" : "text-expense"}`}>
        {points > 0 ? "+" : "−"}
        {Math.abs(points)} pts
      </span>{" "}
      <span className="text-muted">vs {comparedWith}</span>
    </p>
  );
}

const INSIGHT_LOOK = {
  good: { Icon: CheckIcon, className: "bg-mint text-mint-ink", srLabel: "Good news" },
  bad: { Icon: AlertIcon, className: "bg-rose text-rose-ink", srLabel: "Watch out" },
  neutral: { Icon: InfoIcon, className: "bg-cloud text-cloud-ink", srLabel: "Note" },
} as const;

function Insights({ insights }: { insights: readonly Insight[] }) {
  return (
    <Card title="Highlights" description="What stands out in this period">
      {insights.length === 0 ? (
        <p className="py-4 text-sm text-muted">Not enough activity yet to point anything out.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => {
            const { Icon, className, srLabel } = INSIGHT_LOOK[insight.tone];
            return (
              <li key={insight.text} className="flex items-start gap-3 text-sm">
                <span aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${className}`}>
                  <Icon width={14} height={14} />
                </span>
                <span className="pt-1">
                  <span className="sr-only">{srLabel}: </span>
                  {insight.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function CategoryTable({
  trends,
  months,
  currency,
  comparedWith,
}: {
  trends: readonly CategoryTrend[];
  months: readonly string[];
  currency: string;
  comparedWith: string;
}) {
  if (trends.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No spending in this period.</p>;
  }
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th scope="col" className="px-2 pb-2 font-medium">Category</th>
            <th scope="col" className="px-2 pb-2 text-right font-medium">Spent</th>
            <th scope="col" className="px-2 pb-2 text-right font-medium">Share</th>
            <th scope="col" className="px-2 pb-2 font-medium">vs before</th>
            <th scope="col" className="px-2 pb-2 text-right font-medium">Per month</th>
            <th scope="col" className="w-28 px-2 pb-2 font-medium">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {trends.map((trend) => {
            const name = trend.categoryName ?? "Uncategorised";
            return (
              <tr key={trend.categoryId ?? "uncategorised"}>
                <th scope="row" className="max-w-48 truncate px-2 py-2.5 text-left font-medium">{name}</th>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatMoney(trend.cents, currency)}</td>
                <td className="px-2 py-2.5 text-right text-muted tabular-nums">{Math.round(trend.share * 100)}%</td>
                <td className="px-2 py-2.5">
                  <ChangeBadge change={trend.change} riseIs="bad" comparedWith={comparedWith} />
                </td>
                <td className="px-2 py-2.5 text-right text-muted tabular-nums">
                  {formatMoney(Math.round(trend.cents / months.length), currency)}
                </td>
                <td className="px-2 py-2.5">
                  <Sparkline
                    label={`${name} spending`}
                    accentClassName="bg-chart-expense"
                    points={months.map((month, index) => ({
                      label: formatMonthLabel(month),
                      value: trend.monthly[index] ?? 0,
                      display: formatMoney(trend.monthly[index] ?? 0, currency),
                    }))}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LargestExpenses({ expenses, currency }: { expenses: readonly ReportTransaction[]; currency: string }) {
  if (expenses.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No spending in this period.</p>;
  }
  return (
    <ol className="divide-y divide-border">
      {expenses.map((expense, index) => (
        <li key={expense.id} className="flex items-center gap-3 py-2.5">
          <span className="w-4 shrink-0 text-right text-xs text-muted tabular-nums">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {expense.note || expense.categoryName || "Expense"}
            </p>
            <p className="truncate text-xs text-muted">
              {[expense.categoryName, expense.accountName, formatDayWithYear(expense.occurredOn)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            −{formatMoney(expense.amountCents, currency)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function MonthlyTable({ months, currency }: { months: readonly MonthReport[]; currency: string }) {
  const signed = (cents: number) => `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${formatMoney(Math.abs(cents), currency)}`;
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th scope="col" className="px-2 pb-2 font-medium">Month</th>
            <th scope="col" className="px-2 pb-2 text-right font-medium">Income</th>
            <th scope="col" className="px-2 pb-2 text-right font-medium">Spending</th>
            <th scope="col" className="px-2 pb-2 text-right font-medium">Saved</th>
            <th scope="col" className="px-2 pb-2 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[...months].reverse().map((month) => (
            <tr key={month.month}>
              <th scope="row" className="px-2 py-2.5 text-left font-medium">{formatMonthLabel(month.month)}</th>
              <td className="px-2 py-2.5 text-right tabular-nums">{formatMoney(month.incomeCents, currency)}</td>
              <td className="px-2 py-2.5 text-right tabular-nums">{formatMoney(month.expenseCents, currency)}</td>
              <td className={`px-2 py-2.5 text-right font-medium tabular-nums ${month.netCents < 0 ? "text-expense" : ""}`}>
                {signed(month.netCents)}
              </td>
              <td className="px-2 py-2.5 text-right text-muted tabular-nums">{percentText(month.savingsRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-6 ${className}`}>{children}</div>;
}

async function ReportsView({ range }: { range: ReportRange }) {
  const defaultCurrency = await getDefaultCurrency();
  const period = reportPeriod(todayIn(HOME_TIME_ZONE), range);
  const [fetched, rates] = await Promise.all([
    listTransactionsBetween(period.previous.start, period.end),
    getExchangeRates(defaultCurrency),
  ]);
  // Every figure below is in one currency: others are converted to the
  // default where a rate exists, and only the rest stay out (and are named).
  const { items: converted, conversion } = convertTransactionAmounts(fetched, rates);
  const currency = chartCurrency(
    [...new Set(converted.map((transaction) => transaction.currency))],
    defaultCurrency,
  );

  const inCurrency = converted.filter((transaction) => transaction.currency === currency);
  const current = inCurrency.filter((transaction) => isWithin(transaction.occurredOn, period));
  const previous = inCurrency.filter((transaction) => isWithin(transaction.occurredOn, period.previous));

  if (!currency || periodTotals(current).count === 0) {
    return (
      <Card>
        <EmptyState
          icon={ReportsIcon}
          tone="rose"
          title="Nothing to report for this period"
          description="Record some income and expenses, and your trends, breakdowns, and highlights appear here."
        />
      </Card>
    );
  }

  const totals = periodTotals(current);
  const before = periodTotals(previous);
  const months = monthlyReport(current, period.months);
  const trends = categoryTrends(current, previous, period.months);
  const weekdays = spendingByWeekday(current, period);
  const largest = largestExpenses(current, LARGEST_SHOWN);
  const incomeSources = totalsByCategory(current, "income");
  const accounts = spendingByAccount(current);
  const insights = buildInsights({
    currency,
    current: totals,
    previous: before,
    months,
    trends,
    weekdays,
    largest: largest[0],
  });

  const comparedWith = `previous ${rangeLabel(range)}`;
  const show = (cents: number) => approximate(formatMoney(cents, currency), conversion, currency);
  const leftOut = [...new Set(converted.map((transaction) => transaction.currency))].filter((code) => code !== currency);
  const firstMonth = period.months[0] ?? "";
  const lastMonth = period.months[period.months.length - 1] ?? "";

  return (
    <div className="flex flex-col gap-6">
      {/* Two per row: each tile carries a figure, a change line and a
          sparkline, which four abreast squeezed until the figures truncated. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard
          label="Income"
          {...MONEY_STYLE.income}
          values={[show(totals.incomeCents)]}
          change={<ChangeBadge change={percentChange(totals.incomeCents, before.incomeCents)} riseIs="good" comparedWith={comparedWith} />}
          trend={<CashFlowTrend months={months} currency={currency} measure="income" />}
        />
        <StatCard
          label="Spending"
          {...MONEY_STYLE.spent}
          values={[show(totals.expenseCents)]}
          change={<ChangeBadge change={percentChange(totals.expenseCents, before.expenseCents)} riseIs="bad" comparedWith={comparedWith} />}
          trend={<CashFlowTrend months={months} currency={currency} measure="expense" />}
        />
        <StatCard
          label="Saved"
          {...MONEY_STYLE.netFlow}
          values={[show(totals.netCents)]}
          change={<ChangeBadge change={percentChange(totals.netCents, before.netCents)} riseIs="good" comparedWith={comparedWith} />}
          trend={<CashFlowTrend months={months} currency={currency} measure="net" />}
        />
        <StatCard
          label="Savings rate"
          icon={TrendIcon}
          tone="sky"
          values={[percentText(totals.savingsRate)]}
          change={<RateChange current={totals.savingsRate} previous={before.savingsRate} comparedWith={comparedWith} />}
        />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <span>
          <span className="font-medium text-foreground tabular-nums">{show(Math.round(totals.expenseCents / period.days))}</span> spent per day on average
        </span>
        <span>
          <span className="font-medium text-foreground tabular-nums">{totals.count}</span> income and expense entries
        </span>
        <span>
          {formatMonthShort(firstMonth)}–{formatMonthShort(lastMonth)}, {period.days} days, compared with the {period.days} days before
        </span>
      </div>

      <Insights insights={insights} />

      <SectionGrid className="lg:grid-cols-2">
        <Card title="Income vs. spending" description={`Month by month, in ${currency}`}>
          <CashFlowChart months={months} currency={currency} />
        </Card>
        <Card title="Savings trend" description="Income minus spending, added up month by month">
          <SavingsLineChart
            currency={currency}
            points={months.map((month) => ({
              label: formatMonthLabel(month.month),
              shortLabel: formatMonthShort(month.month),
              cumulativeCents: month.cumulativeNetCents,
              monthCents: month.netCents,
            }))}
          />
        </Card>
      </SectionGrid>

      <Card title="Spending by category" description={`This period, compared with the ${comparedWith}`}>
        <CategoryTable trends={trends} months={period.months} currency={currency} comparedWith={comparedWith} />
      </Card>

      <SectionGrid className="lg:grid-cols-3">
        <Card title="By day of the week" description="Average spent on each day">
          <ColumnChart
            seriesLabel="Average spent by day of the week"
            barClassName="bg-chart-expense"
            columns={weekdays.map((day) => ({
              key: day.label,
              label: day.label,
              value: day.averageCents,
              display: formatMoney(day.averageCents, currency),
            }))}
          />
        </Card>
        <Card title="Income sources" description="Where your money came from">
          {incomeSources.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No income in this period.</p>
          ) : (
            <RankedBars
              rows={incomeSources.map((source) => ({
                key: source.categoryId ?? "uncategorised",
                label: source.categoryName ?? "Uncategorised",
                cents: source.cents,
              }))}
              currency={currency}
              barClassName="bg-chart-income"
              otherNoun="sources"
            />
          )}
        </Card>
        <Card title="Spending by account" description="Which accounts the money left from">
          {accounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No spending in this period.</p>
          ) : (
            <RankedBars
              rows={accounts.map((account) => ({ key: account.accountId, label: account.accountName, cents: account.cents }))}
              currency={currency}
              barClassName="bg-chart-expense"
              otherNoun="accounts"
            />
          )}
        </Card>
      </SectionGrid>

      <SectionGrid className="lg:grid-cols-2">
        <Card title="Biggest expenses" description={`The ${LARGEST_SHOWN} largest in this period`}>
          <LargestExpenses expenses={largest} currency={currency} />
        </Card>
        <Card title="Month by month" description="Newest first">
          <MonthlyTable months={months} currency={currency} />
        </Card>
      </SectionGrid>

      <div className="flex flex-col gap-1 text-xs text-muted">
        <ConversionNote conversion={conversion} rates={rates} currencies={fetched.map((transaction) => transaction.currency)} />
        {leftOut.length > 0 && (
          <p>
            Figures are in {currency}. Amounts in {leftOut.join(", ")} have no exchange rate, so
            they&apos;re left out rather than mixed in.
          </p>
        )}
        {fetched.length === TRANSACTION_ROW_LIMIT && (
          <p>
            This period has more than {TRANSACTION_ROW_LIMIT} transactions, so the oldest aren&apos;t
            counted. Try a shorter period for exact figures.
          </p>
        )}
        <p>Transfers between your own accounts aren&apos;t counted as income or spending.</p>
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-80 animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
    </div>
  );
}

export default function ReportsPage({ searchParams }: PageProps<"/reports">) {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Where your money comes from, where it goes, and how that's changing."
      />
      {/* searchParams is request-time data under Cache Components, so it's
          read inside the boundary rather than by the page. */}
      <Suspense fallback={<ReportsSkeleton />}>
        {searchParams.then((params) => {
          const range = parseReportRange(params.months);
          return (
            <>
              <RangeFilter selected={range} />
              <ReportsView range={range} />
            </>
          );
        })}
      </Suspense>
    </>
  );
}
