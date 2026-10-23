import {
  ACCOUNT_TYPE_LABELS,
  accountToInput,
  formatMoney,
  isLiabilityAccount,
} from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AccountCardLarge } from "@/components/account-card";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { AccountsIcon, ChevronLeftIcon, TransactionsIcon } from "@/components/icons";
import { MoneyTile } from "@/components/money-tile";
import { PageHeader } from "@/components/page-header";
import { TransactionLine } from "@/components/transaction-line";
import {
  displayBalance,
  getAccount,
  getMonthActivity,
  listAccountTransactions,
  type AccountTransaction,
  type AccountWithBalance,
} from "@/lib/accounts";
import { listCurrencyOptions } from "@/lib/currencies";
import { AccountDialog } from "../account-dialog";
import { updateAccount } from "../actions";

export const metadata: Metadata = { title: "Account" };

// occurred_on is a calendar date with no time zone; formatting it as UTC keeps
// "2026-10-23" from showing as the 22nd for anyone west of Greenwich.
const dayHeadingFormat = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const addedOnFormat = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "long",
  timeZone: "Asia/Manila",
});
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });

/** Credit cards are about debt, so their figures are worded around owing. */
function wordingFor(account: AccountWithBalance) {
  return isLiabilityAccount(account.type)
    ? {
        balanceTitle: "Amount owed",
        balanceHint: "What you currently owe on this card.",
        moneyIn: "Payments",
        moneyOut: "Charges",
        starting: "Owed when added",
      }
    : {
        balanceTitle: "Current balance",
        balanceHint: "Starting balance plus everything recorded below.",
        moneyIn: "Money in",
        moneyOut: "Money out",
        starting: "Starting balance",
      };
}

async function BalanceSummary({ account }: { account: AccountWithBalance }) {
  const activity = await getMonthActivity(account.id);
  const wording = wordingFor(account);
  const balance = displayBalance(account);

  return (
    <Card className="flex h-full flex-col justify-between gap-6">
      <div>
        <p className="text-sm font-medium text-muted">{wording.balanceTitle}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
          {formatMoney(balance.cents, account.currency)}
        </p>
        <p className="mt-1 text-sm text-muted">{wording.balanceHint}</p>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">
          This month · {activity.monthLabel}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <MoneyTile
            label={wording.moneyIn}
            cents={activity.moneyInCents}
            currency={account.currency}
            tone="income"
          />
          <MoneyTile
            label={wording.moneyOut}
            cents={activity.moneyOutCents}
            currency={account.currency}
            tone="expense"
          />
        </div>
      </div>
    </Card>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

function AccountDetails({ account }: { account: AccountWithBalance }) {
  const wording = wordingFor(account);
  const startingCents = isLiabilityAccount(account.type)
    ? -account.openingBalanceCents
    : account.openingBalanceCents;

  return (
    <Card title="Details">
      <dl className="-my-3 divide-y divide-border">
        <DetailRow label="Bank or e-wallet">
          {account.institution ?? <span className="font-normal text-muted">Not set</span>}
        </DetailRow>
        <DetailRow label="Type">{ACCOUNT_TYPE_LABELS[account.type].singular}</DetailRow>
        <DetailRow label="Currency">
          {account.currency}
          <span className="block text-xs font-normal text-muted">
            {currencyNames.of(account.currency)}
          </span>
        </DetailRow>
        <DetailRow label={wording.starting}>
          <span className="tabular-nums">
            {formatMoney(startingCents, account.currency)}
          </span>
        </DetailRow>
        <DetailRow label="Added">{addedOnFormat.format(new Date(account.createdAt))}</DetailRow>
      </dl>
    </Card>
  );
}

function describe(transaction: AccountTransaction): string {
  if (transaction.type === "transfer") {
    const direction = transaction.amountCents > 0 ? "from" : "to";
    return transaction.counterpartName
      ? `Transfer ${direction} ${transaction.counterpartName}`
      : "Transfer";
  }
  return transaction.categoryName ?? (transaction.type === "income" ? "Income" : "Expense");
}

function TransactionRow({
  transaction,
  currency,
}: {
  transaction: AccountTransaction;
  currency: string;
}) {
  const isMoneyIn = transaction.amountCents > 0;
  return (
    <li className="py-3">
      <TransactionLine
        type={transaction.type}
        title={describe(transaction)}
        detail={transaction.note}
        amount={
          // A real minus sign, and an explicit plus, so direction never hinges on colour alone.
          <span className={isMoneyIn ? "text-income" : undefined}>
            {isMoneyIn ? "+" : "−"}
            {formatMoney(Math.abs(transaction.amountCents), currency)}
          </span>
        }
      />
    </li>
  );
}

/** Consecutive transactions sharing a date; the list is already newest first. */
function groupByDay(transactions: AccountTransaction[]): [string, AccountTransaction[]][] {
  const groups: [string, AccountTransaction[]][] = [];
  for (const transaction of transactions) {
    const last = groups.at(-1);
    if (last && last[0] === transaction.occurredOn) last[1].push(transaction);
    else groups.push([transaction.occurredOn, [transaction]]);
  }
  return groups;
}

async function TransactionHistory({ account }: { account: AccountWithBalance }) {
  const transactions = await listAccountTransactions(account.id);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={TransactionsIcon}
        tone="sky"
        title="No transactions yet"
        description="Income, expenses, and transfers for this account will show up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groupByDay(transactions).map(([day, dayTransactions]) => (
        <section key={day} aria-label={dayHeadingFormat.format(new Date(day))}>
          <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
            {dayHeadingFormat.format(new Date(day))}
          </h3>
          <ul className="divide-y divide-border">
            {dayTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                currency={account.currency}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function AccountDetail({ id }: { id: string }) {
  const account = await getAccount(id);
  // Shown in place rather than via notFound(): this renders inside a streamed
  // boundary, where notFound() can no longer change the status and only swaps
  // in the generic 404 page once the browser has loaded.
  if (!account) {
    return (
      <Card>
        <EmptyState
          icon={AccountsIcon}
          tone="mint"
          title="Account not found"
          description="It may have been deleted, or the link is wrong."
        />
      </Card>
    );
  }

  const subtitle = [account.institution, ACCOUNT_TYPE_LABELS[account.type].singular]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title={account.name}
        description={subtitle}
        actions={
          <AccountDialog
            mode="edit"
            initial={accountToInput(account)}
            action={updateAccount.bind(null, account.id)}
            currencyOptions={listCurrencyOptions()}
            triggerLabel="Edit account"
            triggerVariant="secondary"
          />
        }
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
        <AccountCardLarge account={account} />
        <Suspense fallback={<div className="h-full min-h-56 animate-pulse rounded-2xl bg-surface-sunken" />}>
          <BalanceSummary account={account} />
        </Suspense>
      </div>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <Card title="Transaction history" description="Newest first">
          <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-surface-sunken" />}>
            <TransactionHistory account={account} />
          </Suspense>
        </Card>
        <AccountDetails account={account} />
      </div>
    </>
  );
}

function AccountDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="aspect-[1.6] w-full animate-pulse rounded-2xl bg-surface-sunken" />
        <div className="h-56 animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
    </div>
  );
}

export default function AccountPage({ params }: PageProps<"/accounts/[id]">) {
  return (
    <>
      <Link
        href="/accounts"
        className="-ml-2 mb-4 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ChevronLeftIcon width={16} height={16} /> All accounts
      </Link>
      {/* params is request-time data under Cache Components, so it is awaited
          inside the boundary rather than by the page. */}
      <Suspense fallback={<AccountDetailSkeleton />}>
        {params.then(({ id }) => (
          <AccountDetail id={id} />
        ))}
      </Suspense>
    </>
  );
}
