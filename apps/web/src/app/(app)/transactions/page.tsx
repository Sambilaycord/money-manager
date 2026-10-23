import {
  blankTransactionInput,
  cashFlowByCurrency,
  filterTransactions,
  formatMoney,
  formatMonthLabel,
  hasActiveFilters,
  HOME_TIME_ZONE,
  NO_TRANSACTION_FILTERS,
  paginate,
  shiftMonth,
  todayIn,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  transactionToInput,
  type CashFlow,
  type Category,
  type Page,
  type TransactionListItem,
} from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import {
  AccountsIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TransactionsIcon,
  TrendIcon,
} from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { describeListItem, ListItemAmount, TransactionLine } from "@/components/transaction-line";
import { buttonClassName, iconButtonClassName } from "@/components/ui/button";
import { listOpenAccounts } from "@/lib/accounts";
import {
  parseTransactionPageParams,
  TRANSACTION_PARAMS,
  transactionsHref,
  type TransactionPageParams,
} from "@/lib/transaction-params";
import { listCategories, listMonthTransactions, TRANSACTION_ROW_LIMIT } from "@/lib/transactions";
import { createTransaction, deleteTransaction, updateTransaction } from "./actions";
import { ChecklistFilter } from "./checklist-filter";
import { DateFilter } from "./date-filter";
import { TransactionDialog } from "./transaction-dialog";
import type { TransactionAccountOption } from "./transaction-form";
import { TransactionSearch } from "./transaction-search";

export const metadata: Metadata = { title: "Transactions" };

const PAGE_SIZE = 50;

// occurred_on is a calendar date with no time zone; formatting it as UTC keeps
// "2026-10-23" from showing as the 22nd for anyone west of Greenwich.
const dayHeadingFormat = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

// cache() so the header button and the list share one query per request.
const loadFormOptions = cache(
  async (): Promise<{ accounts: TransactionAccountOption[]; categories: Category[] }> => {
    const [accounts, categories] = await Promise.all([listOpenAccounts(), listCategories()]);
    return {
      accounts: accounts.map(({ id, name, currency }) => ({ id, name, currency })),
      categories,
    };
  },
);

function groupByDay(transactions: TransactionListItem[]): [string, TransactionListItem[]][] {
  const days = new Map<string, TransactionListItem[]>();
  for (const transaction of transactions) {
    days.set(transaction.occurredOn, [...(days.get(transaction.occurredOn) ?? []), transaction]);
  }
  return [...days];
}

/**
 * Edit forms offer the open accounts, plus the transaction's own accounts in
 * case one has since been archived, so opening the form never silently moves it.
 */
function accountOptionsFor(
  transaction: TransactionListItem,
  openAccounts: TransactionAccountOption[],
): TransactionAccountOption[] {
  const own: TransactionAccountOption[] = [
    { id: transaction.accountId, name: transaction.accountName, currency: transaction.currency },
  ];
  if (transaction.transferAccountId) {
    own.push({
      id: transaction.transferAccountId,
      name: transaction.transferAccountName ?? "Unknown account",
      currency: transaction.currency,
    });
  }
  const missing = own.filter((account) => !openAccounts.some((open) => open.id === account.id));
  return [...openAccounts, ...missing];
}

function TransactionRow({
  transaction,
  accounts,
  categories,
}: {
  transaction: TransactionListItem;
  accounts: TransactionAccountOption[];
  categories: Category[];
}) {
  const { title, detail } = describeListItem(transaction);
  return (
    <li>
      <TransactionDialog
        mode="edit"
        initial={transactionToInput(transaction)}
        action={updateTransaction.bind(null, transaction.id)}
        deleteAction={deleteTransaction.bind(null, transaction.id)}
        accounts={accountOptionsFor(transaction, accounts)}
        categories={categories}
        triggerClassName="flex w-full rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary"
        trigger={
          <TransactionLine
            type={transaction.type}
            title={title}
            detail={detail}
            amount={<ListItemAmount transaction={transaction} />}
            density="compact"
          />
        }
      />
    </li>
  );
}

function MonthNav({ params }: { params: TransactionPageParams }) {
  // A day range belongs to one month, so it never carries over to another.
  const hrefFor = (delta: number) =>
    transactionsHref({
      month: shiftMonth(params.month, delta),
      page: 1,
      filters: { ...params.filters, dateFrom: null, dateTo: null },
    });
  return (
    <nav aria-label="Month" className="flex shrink-0 items-center justify-center gap-1">
      <Link
        href={hrefFor(-1)}
        aria-label="Previous month"
        className={iconButtonClassName}
      >
        <ChevronLeftIcon width={18} height={18} />
      </Link>
      <h2 className="min-w-36 text-center text-sm font-semibold">{formatMonthLabel(params.month)}</h2>
      <Link
        href={hrefFor(1)}
        aria-label="Next month"
        className={iconButtonClassName}
      >
        <ChevronRightIcon width={18} height={18} />
      </Link>
    </nav>
  );
}

function Toolbar({
  params,
  today,
  accounts,
}: {
  params: TransactionPageParams;
  /** YYYY-MM-DD in the home time zone. */
  today: string;
  accounts: TransactionAccountOption[];
}) {
  const { filters } = params;
  return (
    <div className="border-b border-border p-3 sm:p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <MonthNav params={params} />
        <TransactionSearch search={filters.search} />
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 lg:flex lg:shrink-0 lg:items-center">
          <ChecklistFilter
            label="Accounts"
            param={TRANSACTION_PARAMS.hiddenAccount}
            hidden={filters.hiddenAccountIds}
            groups={[
              { options: accounts.map((account) => ({ value: account.id, label: account.name })) },
            ]}
          />
          <ChecklistFilter
            label="Types"
            param={TRANSACTION_PARAMS.hiddenType}
            hidden={filters.hiddenTypes}
            groups={[
              {
                options: TRANSACTION_TYPES.map((type) => ({
                  value: type,
                  label: TRANSACTION_TYPE_LABELS[type],
                })),
              },
            ]}
          />
          <DateFilter
            month={params.month}
            today={today}
            from={filters.dateFrom}
            to={filters.dateTo}
          />
        </div>
        {hasActiveFilters(filters) && (
          <Link
            href={transactionsHref({ month: params.month, page: 1, filters: NO_TRANSACTION_FILTERS })}
            className={buttonClassName("ghost", "shrink-0")}
          >
            Clear
          </Link>
        )}
      </div>
    </div>
  );
}

function Summary({ transactions }: { transactions: TransactionListItem[] }) {
  const flows = cashFlowByCurrency(transactions);
  const values = (pick: (flow: CashFlow) => number) =>
    flows.map((flow) => formatMoney(pick(flow), flow.currency));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Income" icon={ArrowDownLeftIcon} tone="mint" values={values((flow) => flow.incomeCents)} />
      <StatCard label="Spent" icon={ArrowUpRightIcon} tone="peach" values={values((flow) => flow.expenseCents)} />
      <StatCard
        label="Net"
        icon={TrendIcon}
        tone="sky"
        values={values((flow) => flow.incomeCents - flow.expenseCents)}
      />
    </div>
  );
}

function DayGroup({
  day,
  transactions,
  accounts,
  categories,
}: {
  day: string;
  transactions: TransactionListItem[];
  accounts: TransactionAccountOption[];
  categories: Category[];
}) {
  return (
    <section className="not-first:mt-3">
      <h3 className="flex items-baseline justify-between gap-4 px-3 pb-0.5 text-[11px] font-medium tracking-wide text-muted uppercase">
        <span>{dayHeadingFormat.format(new Date(day))}</span>
        <span className="font-normal normal-case">
          {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}
        </span>
      </h3>
      <ul>
        {transactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            accounts={accounts}
            categories={categories}
          />
        ))}
      </ul>
    </section>
  );
}

function Pagination({
  params,
  page,
}: {
  params: TransactionPageParams;
  page: Page<TransactionListItem>;
}) {
  const hrefFor = (target: number) => transactionsHref({ ...params, page: target });
  const linkClassName = buttonClassName("secondary");
  const disabledClassName = buttonClassName("secondary", "pointer-events-none opacity-50");
  return (
    <nav
      aria-label="Pages"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-muted">
        Showing {page.firstIndex + 1}–{page.firstIndex + page.items.length} of {page.total}
      </p>
      <div className="flex items-center gap-2">
        {page.page > 1 ? (
          <Link href={hrefFor(page.page - 1)} scroll={false} className={linkClassName}>
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClassName}>
            Previous
          </span>
        )}
        <span className="px-2 text-sm text-muted">
          Page {page.page} of {page.pageCount}
        </span>
        {page.page < page.pageCount ? (
          <Link href={hrefFor(page.page + 1)} scroll={false} className={linkClassName}>
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClassName}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

async function TransactionsView({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { accounts, categories } = await loadFormOptions();
  if (accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={AccountsIcon}
          tone="mint"
          title="Add an account first"
          description="Every transaction belongs to an account, like a bank account, e-wallet, or cash."
          action={
            <Link href="/accounts" className={buttonClassName("primary")}>
              Go to accounts
            </Link>
          }
        />
      </Card>
    );
  }

  const today = todayIn(HOME_TIME_ZONE);
  const params = parseTransactionPageParams(searchParams, today);
  const monthTransactions = await listMonthTransactions(params.month);
  const matching = filterTransactions(monthTransactions, params.filters);
  const page = paginate(matching, params.page, PAGE_SIZE);
  const isFiltered = hasActiveFilters(params.filters);

  return (
    <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1">
      <Summary transactions={matching} />
      {/* A fixed height, scrolling inside, so the card doesn't jump in size as
          months, filters, and pages change how many rows there are. On wide
          screens it fills what the page leaves, so only the list scrolls. */}
      <section className="flex h-[75dvh] min-h-[28rem] flex-col rounded-2xl border border-border bg-surface shadow-card lg:h-auto lg:min-h-0 lg:flex-1">
        <div className="shrink-0">
          <Toolbar params={params} today={today} accounts={accounts} />
        </div>
        {page.total === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-2 sm:p-3">
            <EmptyState
              icon={TransactionsIcon}
              tone="sky"
              title={isFiltered ? "No matches" : "No transactions yet"}
              description={
                isFiltered
                  ? `Nothing in ${formatMonthLabel(params.month)} matches this search and these filters.`
                  : `Nothing recorded in ${formatMonthLabel(params.month)}.`
              }
            />
          </div>
        ) : (
          <>
            {/* Keyed by the view so a new page or month starts scrolled to the top. */}
            <div
              key={transactionsHref(params)}
              className="min-h-0 flex-1 overflow-y-auto p-2 pt-5 sm:p-3 sm:pt-6"
            >
              {groupByDay(page.items).map(([day, dayTransactions]) => (
                <DayGroup
                  key={day}
                  day={day}
                  transactions={dayTransactions}
                  accounts={accounts}
                  categories={categories}
                />
              ))}
            </div>
            <div className="shrink-0 border-t border-border px-4 py-3 sm:px-5">
              <Pagination params={params} page={page} />
            </div>
          </>
        )}
      </section>
      {monthTransactions.length === TRANSACTION_ROW_LIMIT && (
        <p className="shrink-0 text-xs text-muted">
          This month has more than {TRANSACTION_ROW_LIMIT} transactions, so some aren&apos;t shown
          and the totals only cover the ones that are.
        </p>
      )}
    </div>
  );
}

const addTransactionLabel = (
  <>
    <PlusIcon width={18} height={18} />
    Add transaction
  </>
);

async function AddTransactionAction() {
  const { accounts, categories } = await loadFormOptions();
  const [firstAccount] = accounts;
  if (!firstAccount) return null;
  return (
    <TransactionDialog
      mode="create"
      initial={blankTransactionInput(firstAccount.id, todayIn(HOME_TIME_ZONE))}
      action={createTransaction}
      accounts={accounts}
      categories={categories}
      trigger={addTransactionLabel}
      triggerClassName={buttonClassName("primary")}
    />
  );
}

function TransactionsSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-16 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-border bg-surface lg:h-auto lg:flex-1" />
    </div>
  );
}

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    // On wide screens the page is exactly the viewport less <main>'s lg
    // padding in (app)/layout.tsx (pt-10 + pb-12 = 5.5rem), so the window
    // itself never scrolls; phones stack too much to fit and scroll as usual.
    <div className="flex flex-col lg:h-[calc(100dvh-5.5rem)] lg:min-h-[36rem]">
      <PageHeader
        title="Transactions"
        description="Every income, expense, and transfer across your accounts."
        actions={
          <Suspense
            fallback={
              <button type="button" disabled className={buttonClassName("primary")}>
                {addTransactionLabel}
              </button>
            }
          >
            <AddTransactionAction />
          </Suspense>
        }
      />
      {/* searchParams is request-time data under Cache Components, so it is
          awaited inside the boundary rather than by the page. */}
      <Suspense fallback={<TransactionsSkeleton />}>
        {searchParams.then((params) => (
          <TransactionsView searchParams={params} />
        ))}
      </Suspense>
    </div>
  );
}
