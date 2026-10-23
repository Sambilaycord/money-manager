import "server-only";
import {
  formatMonthLabel,
  HOME_TIME_ZONE,
  isAccountType,
  isLiabilityAccount,
  isUuid,
  monthOf,
  monthRange,
  todayIn,
  type Account,
  type TransactionType,
} from "@money-manager/shared";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface AccountWithBalance extends Account {
  balanceCents: number;
  /** ISO timestamp. */
  createdAt: string;
}

const ACCOUNT_COLUMNS =
  "id, name, institution, type, currency, opening_balance_cents, color, is_archived, created_at";

interface AccountRow {
  id: string;
  name: string;
  institution: string | null;
  type: string;
  currency: string;
  opening_balance_cents: number;
  color: string | null;
  is_archived: boolean;
  created_at: string;
}

function toAccount(row: AccountRow, balanceCents: number | null): AccountWithBalance | null {
  // The column is a CHECK-constrained text, so the generated type is plain
  // string; anything outside the shared list means the two have drifted.
  if (!isAccountType(row.type)) {
    console.error(`Account ${row.id} has unknown type "${row.type}"; skipping it`);
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    institution: row.institution,
    type: row.type,
    currency: row.currency,
    openingBalanceCents: row.opening_balance_cents,
    color: row.color,
    isArchived: row.is_archived,
    balanceCents: balanceCents ?? row.opening_balance_cents,
    createdAt: row.created_at,
  };
}

/** The signed-in user's open accounts, oldest first. RLS limits rows to the owner. */
export async function listOpenAccounts(): Promise<AccountWithBalance[]> {
  const supabase = await createClient();

  const [accountsResult, balancesResult] = await Promise.all([
    supabase.from("accounts").select(ACCOUNT_COLUMNS).eq("is_archived", false).order("created_at"),
    supabase.from("account_balances").select("account_id, balance_cents"),
  ]);

  if (accountsResult.error) throw accountsResult.error;
  if (balancesResult.error) throw balancesResult.error;

  const balanceById = new Map(
    balancesResult.data.map((row) => [row.account_id, row.balance_cents]),
  );

  return accountsResult.data.flatMap((row) => toAccount(row, balanceById.get(row.id) ?? null) ?? []);
}

/**
 * One of the signed-in user's accounts, or null when it doesn't exist or
 * belongs to someone else (RLS hides it, so the two look the same).
 */
export async function getAccount(id: string): Promise<AccountWithBalance | null> {
  if (!isUuid(id)) return null;

  const supabase = await createClient();
  const [accountResult, balanceResult] = await Promise.all([
    supabase.from("accounts").select(ACCOUNT_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("account_balances").select("balance_cents").eq("account_id", id).maybeSingle(),
  ]);

  if (accountResult.error) throw accountResult.error;
  if (balanceResult.error) throw balanceResult.error;
  if (!accountResult.data) return null;

  return toAccount(accountResult.data, balanceResult.data?.balance_cents ?? null);
}

export async function accountHasTransactions(accountId: string): Promise<boolean> {
  if (!isUuid(accountId)) return false;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    // Safe to interpolate: accountId has just been checked to be a uuid.
    .or(`account_id.eq.${accountId},transfer_account_id.eq.${accountId}`);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export interface AccountTransaction {
  id: string;
  type: TransactionType;
  /** Signed from this account's point of view: money in is positive. */
  amountCents: number;
  note: string | null;
  /** Calendar date, YYYY-MM-DD. */
  occurredOn: string;
  categoryName: string | null;
  /** For transfers, the account on the other side. */
  counterpartName: string | null;
}

const TRANSACTION_HISTORY_LIMIT = 100;

/**
 * A transaction's effect on one account: income and incoming transfers are
 * positive, expenses and outgoing transfers negative. Matches the
 * account_balances view, so totals built from this agree with the balance.
 */
function signedAmountCents(
  row: { type: string; amount_cents: number; account_id: string },
  accountId: string,
): number {
  const isIncomingTransfer = row.type === "transfer" && row.account_id !== accountId;
  return row.type === "income" || isIncomingTransfer ? row.amount_cents : -row.amount_cents;
}

export interface MonthActivity {
  /** e.g. "October 2026". */
  monthLabel: string;
  moneyInCents: number;
  /** Positive: how much left the account. */
  moneyOutCents: number;
}

/** Money in and out of one account during the current calendar month. */
export async function getMonthActivity(accountId: string): Promise<MonthActivity> {
  const month = monthOf(todayIn(HOME_TIME_ZONE));
  const { start, end } = monthRange(month);
  const empty = { monthLabel: formatMonthLabel(month), moneyInCents: 0, moneyOutCents: 0 };
  if (!isUuid(accountId)) return empty;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount_cents, account_id")
    // Safe to interpolate: accountId has just been checked to be a uuid.
    .or(`account_id.eq.${accountId},transfer_account_id.eq.${accountId}`)
    .gte("occurred_on", start)
    .lte("occurred_on", end);

  if (error) throw error;

  return data.reduce((totals, row) => {
    const cents = signedAmountCents(row, accountId);
    return cents > 0
      ? { ...totals, moneyInCents: totals.moneyInCents + cents }
      : { ...totals, moneyOutCents: totals.moneyOutCents - cents };
  }, empty);
}

/** Newest first. A transfer appears in both accounts' histories, with opposite signs. */
export async function listAccountTransactions(accountId: string): Promise<AccountTransaction[]> {
  if (!isUuid(accountId)) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, type, amount_cents, note, occurred_on, account_id,
       category:categories(name),
       source:accounts!transactions_account_id_user_id_fkey(name),
       destination:accounts!transactions_transfer_account_id_user_id_fkey(name)`,
    )
    // Safe to interpolate: accountId has just been checked to be a uuid.
    .or(`account_id.eq.${accountId},transfer_account_id.eq.${accountId}`)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(TRANSACTION_HISTORY_LIMIT);

  if (error) throw error;

  return data.flatMap((row) => {
    if (row.type !== "income" && row.type !== "expense" && row.type !== "transfer") {
      console.error(`Transaction ${row.id} has unknown type "${row.type}"; skipping it`);
      return [];
    }
    const isOutgoing = row.account_id === accountId;
    return [
      {
        id: row.id,
        type: row.type,
        amountCents: signedAmountCents(row, accountId),
        note: row.note,
        occurredOn: row.occurred_on,
        categoryName: row.category?.name ?? null,
        counterpartName:
          row.type === "transfer" ? ((isOutgoing ? row.destination : row.source)?.name ?? null) : null,
      },
    ];
  });
}

/** How a balance reads to a person: credit cards show what is owed, as a positive amount. */
export function displayBalance(account: AccountWithBalance): { cents: number; label: string } {
  if (isLiabilityAccount(account.type)) {
    return { cents: -account.balanceCents, label: account.balanceCents > 0 ? "Credit" : "Owed" };
  }
  return { cents: account.balanceCents, label: "Balance" };
}

const FALLBACK_CURRENCY = "PHP";

// cache() so the header button and the empty state share one query per request.
export const getDefaultCurrency = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("default_currency").maybeSingle();

  if (error) throw error;
  return data?.default_currency ?? FALLBACK_CURRENCY;
});
