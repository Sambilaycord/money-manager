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
  todayIn,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  transactionToInput,
  type CashFlow,
  type Category,
  type Conversion,
  type TransactionListItem,
} from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { ChecklistFilter } from "@/components/list/checklist-filter";
import { ListSearch } from "@/components/list/list-search";
import { Pagination } from "@/components/list/pagination";
import { AccountsIcon, PlusIcon, TransactionsIcon } from "@/components/icons";
import { MONEY_STYLE } from "@/components/money-style";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { describeListItem, ListItemAmount, TransactionLine } from "@/components/transaction-line";
import { buttonClassName } from "@/components/ui/button";
import { approximate, ConversionNote } from "@/components/conversion-note";
import { getDefaultCurrency, listOpenAccounts } from "@/lib/accounts";
import { convertTransactionAmounts } from "@/lib/conversion";
import { getExchangeRates } from "@/lib/exchange-rates";
import {
  parseTransactionPageParams,
  TRANSACTION_PARAMS,
  transactionsHref,
  type TransactionPageParams,
} from "@/lib/transaction-params";
import { listCategories, listMonthTransactions, TRANSACTION_ROW_LIMIT } from "@/lib/transactions";
import { createTransaction, deleteTransaction, updateTransaction } from "./actions";
import { DateFilter } from "./date-filter";
import { TransactionDialog } from "./transaction-dialog";
import type { TransactionAccountOption } from "./transaction-form";

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

/**
 * Likewise the transaction's own category, which may since have been archived
 * and so be missing from the suggestions; without it the edit form would show
 * the transaction as uncategorised and saving would clear it.
 */
function categoryOptionsFor(transaction: TransactionListItem, categories: Category[]): Category[] {
  const { categoryId, categoryName, type } = transaction;
  if (!categoryId || !categoryName || type === "transfer") return categories;
  if (categories.some((category) => category.id === categoryId)) return categories;
  return [...categories, { id: categoryId, name: categoryName, type, isArchived: true }];
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
        categories={categoryOptionsFor(transaction, categories)}
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

/** A day range belongs to one month, so it never carries over to another. */
function hrefForMonth(params: TransactionPageParams, month: string): string {
  return transactionsHref({
    month,
    page: 1,
    filters: { ...params.filters, dateFrom: null, dateTo: null },
  });
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
        <MonthNav month={params.month} hrefForMonth={(month) => hrefForMonth(params, month)} />
        <ListSearch
          search={filters.search}
          placeholder="Search notes, categories, accounts, amounts"
          label="Search transactions"
        />
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

function Summary({
  transactions,
  conversion,
}: {
  /** Already converted to the default currency where rates allow. */
  transactions: TransactionListItem[];
  conversion: Conversion | null;
}) {
  const flows = cashFlowByCurrency(transactions);
  const values = (pick: (flow: CashFlow) => number) =>
    flows.map((flow) => approximate(formatMoney(pick(flow), flow.currency), conversion, flow.currency));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Income" {...MONEY_STYLE.income} values={values((flow) => flow.incomeCents)} />
      <StatCard label="Spent" {...MONEY_STYLE.spent} values={values((flow) => flow.expenseCents)} />
      <StatCard
        label="Net"
        {...MONEY_STYLE.netFlow}
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
  const [monthTransactions, rates] = await Promise.all([
    listMonthTransactions(params.month),
    getDefaultCurrency().then(getExchangeRates),
  ]);
  const matching = filterTransactions(monthTransactions, params.filters);
  // The summary totals convert to the default currency; the list below keeps
  // every transaction in its own account's currency.
  const converted = convertTransactionAmounts(matching, rates);
  const page = paginate(matching, params.page, PAGE_SIZE);
  const isFiltered = hasActiveFilters(params.filters);

  return (
    <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1">
      <div className="flex flex-col gap-3">
        <Summary transactions={converted.items} conversion={converted.conversion} />
        <ConversionNote
          conversion={converted.conversion}
          rates={rates}
          currencies={matching.map((transaction) => transaction.currency)}
        />
      </div>
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
              <Pagination page={page} hrefFor={(target) => transactionsHref({ ...params, page: target })} />
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
