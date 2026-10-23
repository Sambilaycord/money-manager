import {
  blankTransactionInput,
  cashFlowByCurrency,
  chartCurrency,
  formatMoney,
  formatMonthLabel,
  HOME_TIME_ZONE,
  monthOf,
  netWorthByCurrency,
  spendingByCategory,
  todayIn,
  type TransactionListItem,
} from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountCardLink } from "@/components/account-card";
import { Card, cardLinkClassName } from "@/components/card";
import { CategoryBars } from "@/components/charts/category-bars";
import { EmptyState } from "@/components/empty-state";
import {
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  PlusIcon,
  ReportsIcon,
  TransactionsIcon,
  TrendIcon,
  WalletIcon,
} from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { toneClassName, type PastelTone } from "@/components/tone";
import { describeListItem, ListItemAmount, TransactionLine } from "@/components/transaction-line";
import { buttonClassName } from "@/components/ui/button";
import { getDefaultCurrency, listOpenAccounts, type AccountWithBalance } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { listCategories, listMonthTransactions } from "@/lib/transactions";
import { createTransaction } from "../transactions/actions";
import { TransactionDialog } from "../transactions/transaction-dialog";

export const metadata: Metadata = { title: "Dashboard" };

const RECENT_COUNT = 6;
const ACCOUNT_PREVIEW_COUNT = 4;

const hourFormat = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: HOME_TIME_ZONE,
});

function greeting(name: string | null): string {
  const hour = Number(hourFormat.format(new Date()));
  const partOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = name?.split(/\s+/)[0];
  return firstName ? `${partOfDay}, ${firstName}` : partOfDay;
}

async function AddTransactionButton({ accounts }: { accounts: AccountWithBalance[] }) {
  const categories = await listCategories();
  const [firstAccount] = accounts;
  if (!firstAccount) return null;
  return (
    <TransactionDialog
      mode="create"
      initial={blankTransactionInput(firstAccount.id, todayIn(HOME_TIME_ZONE))}
      action={createTransaction}
      accounts={accounts.map(({ id, name, currency }) => ({ id, name, currency }))}
      categories={categories}
      trigger={
        <>
          <PlusIcon width={18} height={18} />
          Add transaction
        </>
      }
      triggerClassName={buttonClassName("primary")}
    />
  );
}

function SummaryStats({
  accounts,
  transactions,
}: {
  accounts: AccountWithBalance[];
  transactions: TransactionListItem[];
}) {
  const flows = cashFlowByCurrency(transactions);
  const netWorth = netWorthByCurrency(accounts);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Net worth"
        icon={WalletIcon}
        tone="cloud"
        values={netWorth.map((worth) => formatMoney(worth.netCents, worth.currency))}
      />
      <StatCard
        label="Income this month"
        icon={ArrowDownLeftIcon}
        tone="mint"
        values={flows.map((flow) => formatMoney(flow.incomeCents, flow.currency))}
      />
      <StatCard
        label="Spent this month"
        icon={ArrowUpRightIcon}
        tone="peach"
        values={flows.map((flow) => formatMoney(flow.expenseCents, flow.currency))}
      />
      <StatCard
        label="Net this month"
        icon={TrendIcon}
        tone="sky"
        values={flows.map((flow) => formatMoney(flow.incomeCents - flow.expenseCents, flow.currency))}
      />
    </div>
  );
}

function RecentActivity({
  transactions,
  monthLabel,
}: {
  transactions: TransactionListItem[];
  monthLabel: string;
}) {
  const recent = transactions.slice(0, RECENT_COUNT);
  return (
    <Card
      title="Recent activity"
      description={`Latest in ${monthLabel}`}
      action={
        <Link href="/transactions" className={cardLinkClassName}>
          View all <ArrowRightIcon width={14} height={14} />
        </Link>
      }
      className="lg:col-span-3"
    >
      {recent.length === 0 ? (
        <EmptyState
          icon={TransactionsIcon}
          tone="sky"
          title="Nothing recorded this month"
          description="Income, expenses, and transfers you add on the web or your phone appear here."
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {recent.map((transaction) => {
            const { title, detail } = describeListItem(transaction);
            return (
              <li key={transaction.id} className="px-2 py-3">
                <TransactionLine
                  type={transaction.type}
                  title={title}
                  detail={detail}
                  amount={<ListItemAmount transaction={transaction} />}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function SpendingBreakdown({
  transactions,
  defaultCurrency,
}: {
  transactions: TransactionListItem[];
  defaultCurrency: string;
}) {
  const spendingCurrencies = cashFlowByCurrency(transactions)
    .filter((flow) => flow.expenseCents > 0)
    .map((flow) => flow.currency);
  const currency = chartCurrency(spendingCurrencies, defaultCurrency);

  return (
    <Card
      title="Where it went"
      description={
        currency && spendingCurrencies.length > 1
          ? `Spending by category, in ${currency}`
          : "Spending by category"
      }
      action={
        <Link href="/reports" className={cardLinkClassName}>
          Reports <ArrowRightIcon width={14} height={14} />
        </Link>
      }
      className="lg:col-span-2"
    >
      {currency ? (
        <CategoryBars spending={spendingByCategory(transactions, currency)} currency={currency} />
      ) : (
        <EmptyState
          icon={ReportsIcon}
          tone="rose"
          title="No spending yet"
          description="Once you record expenses, your biggest categories show up here."
        />
      )}
    </Card>
  );
}

function AccountsPreview({ accounts }: { accounts: AccountWithBalance[] }) {
  return (
    <section aria-labelledby="dashboard-accounts" className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="dashboard-accounts" className="text-base font-semibold tracking-tight">
            Your accounts
          </h2>
          <p className="text-sm text-muted">
            {accounts.length} open {accounts.length === 1 ? "account" : "accounts"}
          </p>
        </div>
        <Link href="/accounts" className={cardLinkClassName}>
          Manage <ArrowRightIcon width={14} height={14} />
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {accounts.slice(0, ACCOUNT_PREVIEW_COUNT).map((account) => (
          <li key={account.id}>
            <AccountCardLink account={account} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const SETUP_STEPS: readonly { tone: PastelTone; title: string; description: string }[] = [
  {
    tone: "mint",
    title: "Add an account",
    description: "A bank account, e-wallet, credit card, or cash, with what's in it today.",
  },
  {
    tone: "sky",
    title: "Record transactions",
    description: "Log income and expenses as they happen, on the web or your phone.",
  },
  {
    tone: "rose",
    title: "See the picture",
    description: "Your dashboard and reports fill in with balances, trends, and categories.",
  },
];

function Onboarding() {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <div className="bg-linear-to-br from-sky via-cloud to-surface px-6 py-10 sm:px-10">
        <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-balance">
          Let&apos;s set up your money manager
        </h2>
        <p className="mt-2 max-w-lg text-sm text-foreground/75 sm:text-base">
          Three steps and your balances, spending, and trends are all in one place.
        </p>
        <Link href="/accounts" className={buttonClassName("primary", "mt-6")}>
          <PlusIcon width={18} height={18} />
          Add your first account
        </Link>
      </div>
      <ol className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {SETUP_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4 p-6">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${toneClassName[step.tone]}`}
            >
              {index + 1}
            </span>
            <div>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function DashboardView() {
  const [user, accounts, defaultCurrency] = await Promise.all([
    getCurrentUser(),
    listOpenAccounts(),
    getDefaultCurrency(),
  ]);
  const month = monthOf(todayIn(HOME_TIME_ZONE));
  const monthLabel = formatMonthLabel(month);
  const title = greeting(user.fullName);

  if (accounts.length === 0) {
    return (
      <>
        <PageHeader title={title} description="Welcome to Money Manager." />
        <Onboarding />
      </>
    );
  }

  const transactions = await listMonthTransactions(month);

  return (
    <>
      <PageHeader
        title={title}
        description={`Here's where your money stands in ${monthLabel}.`}
        actions={<AddTransactionButton accounts={accounts} />}
      />
      <SummaryStats accounts={accounts} transactions={transactions} />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <RecentActivity transactions={transactions} monthLabel={monthLabel} />
        <SpendingBreakdown transactions={transactions} defaultCurrency={defaultCurrency} />
      </div>
      <AccountsPreview accounts={accounts} />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-8 h-9 w-72 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface lg:col-span-3" />
        <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface lg:col-span-2" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    // The greeting, balances, and month all depend on the signed-in user and
    // today's date, so the whole view is request-time.
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardView />
    </Suspense>
  );
}
