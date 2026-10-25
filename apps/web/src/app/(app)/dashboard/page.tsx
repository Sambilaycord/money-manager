import {
  APP_NAME,
  APP_TAGLINE,
  blankTransactionInput,
  budgetLeftByCurrency,
  cashFlowByCurrency,
  chartCurrency,
  formatMoney,
  formatMonthLabel,
  HOME_TIME_ZONE,
  mergeConversions,
  moneyPictureByCurrency,
  monthOf,
  spendingByCategory,
  todayIn,
  type Conversion,
  type MoneyPicture,
  type TransactionListItem,
} from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountCardLink } from "@/components/account-card";
import { Card, cardLinkClassName } from "@/components/card";
import { CategoryBars } from "@/components/charts/category-bars";
import { EmptyState } from "@/components/empty-state";
import { ArrowRightIcon, PlusIcon, ReportsIcon, TransactionsIcon } from "@/components/icons";
import { MoneyPictureCard } from "@/components/money-picture-card";
import { MONEY_STYLE } from "@/components/money-style";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { toneClassName, type PastelTone } from "@/components/tone";
import { describeListItem, ListItemAmount, TransactionLine } from "@/components/transaction-line";
import { buttonClassName } from "@/components/ui/button";
import { approximate, ConversionNote } from "@/components/conversion-note";
import { getDefaultCurrency, listOpenAccounts, type AccountWithBalance } from "@/lib/accounts";
import { listBudgets } from "@/lib/budgets";
import { convertAccountBalances, convertAmounts, convertTransactionAmounts } from "@/lib/conversion";
import { getExchangeRates } from "@/lib/exchange-rates";
import { getCurrentUser } from "@/lib/auth";
import { listCategories, listMonthTransactions } from "@/lib/transactions";
import { listUtang } from "@/lib/utang";
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
  pictures,
  transactions,
  conversion,
}: {
  /** Both already converted to the default currency where rates allow. */
  pictures: MoneyPicture[];
  transactions: TransactionListItem[];
  conversion: Conversion | null;
}) {
  const flows = cashFlowByCurrency(transactions);
  const show = (cents: number, currency: string) =>
    approximate(formatMoney(cents, currency), conversion, currency);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Free to spend"
        {...MONEY_STYLE.held}
        values={pictures.map((picture) => show(picture.freeToSpendCents, picture.currency))}
      />
      <StatCard
        label="Net worth"
        {...MONEY_STYLE.netWorth}
        values={pictures.map((picture) => show(picture.netWorthCents, picture.currency))}
      />
      <StatCard
        label="Income this month"
        {...MONEY_STYLE.income}
        values={flows.map((flow) => show(flow.incomeCents, flow.currency))}
      />
      <StatCard
        label="Spent this month"
        {...MONEY_STYLE.spent}
        values={flows.map((flow) => show(flow.expenseCents, flow.currency))}
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
          Let&apos;s set up {APP_NAME}
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
  const today = todayIn(HOME_TIME_ZONE);
  const month = monthOf(today);
  const monthLabel = formatMonthLabel(month);
  const title = greeting(user.fullName);

  if (accounts.length === 0) {
    return (
      <>
        <PageHeader title={title} description={`Welcome to ${APP_NAME}. ${APP_TAGLINE}`} />
        <Onboarding />
      </>
    );
  }

  const [transactions, rates, budgets, utang] = await Promise.all([
    listMonthTransactions(month),
    getExchangeRates(defaultCurrency),
    listBudgets(),
    listUtang(today),
  ]);
  // Totals and the category chart use amounts in the default currency; the
  // recent-activity list and account previews keep each item's own currency.
  const balances = convertAccountBalances(accounts, rates);
  const amounts = convertTransactionAmounts(transactions, rates);
  const budgetLeft = convertAmounts(budgetLeftByCurrency(budgets, transactions, month), rates);
  const outstanding = convertAmounts(
    utang
      .filter((item) => !item.balance.isSettled)
      .map((item) => ({
        direction: item.direction,
        currency: item.currency,
        cents: item.balance.remainingCents,
      })),
    rates,
  );
  const conversion = mergeConversions(
    balances.conversion,
    amounts.conversion,
    budgetLeft.conversion,
    outstanding.conversion,
  );
  const pictures = moneyPictureByCurrency({
    accounts: balances.items,
    budgetLeft: budgetLeft.items,
    utang: outstanding.items.map((item) => ({ ...item, remainingCents: item.cents })),
  });
  const show = (cents: number, currency: string) =>
    approximate(formatMoney(cents, currency), conversion, currency);

  return (
    <>
      <PageHeader
        title={title}
        description={`Here's where your money stands in ${monthLabel}.`}
        actions={<AddTransactionButton accounts={accounts} />}
      />
      <SummaryStats pictures={pictures} transactions={amounts.items} conversion={conversion} />
      <ConversionNote
        conversion={conversion}
        rates={rates}
        currencies={[...accounts, ...transactions].map((item) => item.currency)}
        className="mt-3"
      />
      <div className="mt-6">
        <MoneyPictureCard pictures={pictures} show={show} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <RecentActivity transactions={transactions} monthLabel={monthLabel} />
        <SpendingBreakdown transactions={amounts.items} defaultCurrency={defaultCurrency} />
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
