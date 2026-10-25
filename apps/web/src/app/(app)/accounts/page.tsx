import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  blankAccountInput,
  formatMoney,
  isLiabilityAccount,
  netWorthByCurrency,
  type AccountType,
  type NetWorth,
} from "@money-manager/shared";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { AccountsIcon, ArrowUpRightIcon, PlusIcon, TrendIcon, WalletIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { buttonClassName } from "@/components/ui/button";
import { AccountCardLink } from "@/components/account-card";
import {
  displayBalance,
  getDefaultCurrency,
  listOpenAccounts,
  type AccountWithBalance,
} from "@/lib/accounts";
import { listCurrencyOptions } from "@/lib/currencies";
import { AccountDialog } from "./account-dialog";
import { createAccount } from "./actions";

export const metadata: Metadata = { title: "Accounts" };

/**
 * One total per currency; amounts in different currencies are never added
 * together. Uses the displayed figure, so a credit card group totals what is owed.
 */
function totalsByCurrency(accounts: AccountWithBalance[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const account of accounts) {
    const { cents } = displayBalance(account);
    totals.set(account.currency, (totals.get(account.currency) ?? 0) + cents);
  }
  return [...totals];
}

function AccountsOverview({ accounts }: { accounts: AccountWithBalance[] }) {
  const netWorth = netWorthByCurrency(accounts);
  const hasCreditCards = netWorth.some((worth) => worth.hasCreditCards);
  const values = (pick: (worth: NetWorth) => number) =>
    netWorth.map((worth) => formatMoney(pick(worth), worth.currency));

  return (
    <div
      className={`mb-10 grid grid-cols-1 gap-4 ${hasCreditCards ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
    >
      <StatCard label="You have" icon={WalletIcon} tone="mint" values={values((worth) => worth.haveCents)} />
      {hasCreditCards && (
        <StatCard
          label="Owed on credit cards"
          icon={ArrowUpRightIcon}
          tone="peach"
          values={values((worth) => worth.owedCents)}
        />
      )}
      <StatCard label="Net worth" icon={TrendIcon} tone="cloud" values={values((worth) => worth.netCents)} />
    </div>
  );
}

function AccountGroup({ type, accounts }: { type: AccountType; accounts: AccountWithBalance[] }) {
  const countLabel = `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`;
  return (
    <section aria-labelledby={`group-${type}`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id={`group-${type}`} className="text-base font-semibold tracking-tight">
            {ACCOUNT_TYPE_LABELS[type].plural}
          </h2>
          <p className="text-sm text-muted">{countLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">{isLiabilityAccount(type) ? "Total owed" : "Total"}</p>
          <p className="text-sm font-semibold tabular-nums">
            {totalsByCurrency(accounts)
              .map(([currency, cents]) => formatMoney(cents, currency))
              .join(" · ")}
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
        {accounts.map((account) => (
          <li key={account.id}>
            <AccountCardLink account={account} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function AccountList() {
  const [accounts, defaultCurrency] = await Promise.all([
    listOpenAccounts(),
    getDefaultCurrency(),
  ]);

  if (accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={AccountsIcon}
          tone="mint"
          title="No accounts yet"
          description="Each account keeps its own balance and currency. Transfers between accounts won't count as spending."
          action={
            <AccountDialog
              mode="create"
              initial={blankAccountInput(defaultCurrency)}
              action={createAccount}
              currencyOptions={listCurrencyOptions()}
              triggerLabel="Add your first account"
            />
          }
        />
      </Card>
    );
  }

  const groups = ACCOUNT_TYPES.map((type) => ({
    type,
    accounts: accounts.filter((account) => account.type === type),
  })).filter((group) => group.accounts.length > 0);

  return (
    <>
      <AccountsOverview accounts={accounts} />
      <div className="flex flex-col gap-12">
        {groups.map((group) => (
          <AccountGroup key={group.type} type={group.type} accounts={group.accounts} />
        ))}
      </div>
    </>
  );
}

async function AddAccountAction() {
  const defaultCurrency = await getDefaultCurrency();
  return (
    <AccountDialog
      mode="create"
      initial={blankAccountInput(defaultCurrency)}
      action={createAccount}
      currencyOptions={listCurrencyOptions()}
      triggerLabel="Add account"
    />
  );
}

function AccountListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
        {[0, 1, 2].map((key) => (
          <div key={key} className="aspect-[1.85] animate-pulse rounded-2xl bg-surface-sunken" />
        ))}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <>
      <PageHeader
        title="Accounts"
        description="Bank accounts, cards, e-wallets, and cash you track."
        actions={
          <Suspense
            fallback={
              <button type="button" disabled className={buttonClassName("primary")}>
                <PlusIcon width={18} height={18} />
                Add account
              </button>
            }
          >
            <AddAccountAction />
          </Suspense>
        }
      />
      <Suspense fallback={<AccountListSkeleton />}>
        <AccountList />
      </Suspense>
    </>
  );
}
