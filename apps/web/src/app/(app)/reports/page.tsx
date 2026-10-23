import {
  cashFlowByCurrency,
  cashFlowByMonth,
  chartCurrency,
  formatMoney,
  HOME_TIME_ZONE,
  monthOf,
  monthRange,
  monthsEndingWith,
  spendingByCategory,
  todayIn,
  type TransactionListItem,
} from "@money-manager/shared";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { CategoryBars } from "@/components/charts/category-bars";
import { EmptyState } from "@/components/empty-state";
import { ArrowDownLeftIcon, ArrowUpRightIcon, ReportsIcon, TrendIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getDefaultCurrency } from "@/lib/accounts";
import { listTransactionsBetween, TRANSACTION_ROW_LIMIT } from "@/lib/transactions";

export const metadata: Metadata = { title: "Reports" };

const MONTHS_SHOWN = 6;

function CategoryCard({
  title,
  transactions,
  currency,
}: {
  title: string;
  transactions: TransactionListItem[];
  currency: string;
}) {
  const spending = spendingByCategory(transactions, currency);
  return (
    <Card title={title} description="Spending by category">
      {spending.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No spending in this period.</p>
      ) : (
        <CategoryBars spending={spending} currency={currency} />
      )}
    </Card>
  );
}

async function ReportsView() {
  const defaultCurrency = await getDefaultCurrency();
  const currentMonth = monthOf(todayIn(HOME_TIME_ZONE));
  const months = monthsEndingWith(currentMonth, MONTHS_SHOWN);
  const transactions = await listTransactionsBetween(
    monthRange(months[0] ?? currentMonth).start,
    monthRange(currentMonth).end,
  );

  const flows = cashFlowByCurrency(transactions);
  const currency = chartCurrency(
    flows.map((flow) => flow.currency),
    defaultCurrency,
  );

  if (!currency) {
    return (
      <Card>
        <EmptyState
          icon={ReportsIcon}
          tone="rose"
          title="Nothing to report yet"
          description="Record some income and expenses, and your trends over the last six months appear here."
        />
      </Card>
    );
  }

  const flow = flows.find((candidate) => candidate.currency === currency);
  const incomeCents = flow?.incomeCents ?? 0;
  const expenseCents = flow?.expenseCents ?? 0;
  const otherCurrencies = flows.map((other) => other.currency).filter((code) => code !== currency);
  const thisMonth = transactions.filter((transaction) => monthOf(transaction.occurredOn) === currentMonth);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Income, 6 months"
          icon={ArrowDownLeftIcon}
          tone="mint"
          values={[formatMoney(incomeCents, currency)]}
        />
        <StatCard
          label="Spent, 6 months"
          icon={ArrowUpRightIcon}
          tone="peach"
          values={[formatMoney(expenseCents, currency)]}
        />
        <StatCard
          label="Saved, 6 months"
          icon={TrendIcon}
          tone="sky"
          values={[formatMoney(incomeCents - expenseCents, currency)]}
        />
      </div>

      <Card title="Income vs. spending" description={`Month by month, in ${currency}`}>
        <CashFlowChart months={cashFlowByMonth(transactions, months, currency)} currency={currency} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryCard title="This month" transactions={thisMonth} currency={currency} />
        <CategoryCard title="Last six months" transactions={transactions} currency={currency} />
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted">
        {otherCurrencies.length > 0 && (
          <p>
            Figures are in {currency}. Amounts in {otherCurrencies.join(", ")} aren&apos;t converted,
            so they&apos;re left out rather than mixed in.
          </p>
        )}
        {transactions.length === TRANSACTION_ROW_LIMIT && (
          <p>
            These months have more than {TRANSACTION_ROW_LIMIT} transactions, so the oldest
            aren&apos;t counted.
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-border bg-surface" />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Trends in your income and spending over the last six months." />
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsView />
      </Suspense>
    </>
  );
}
