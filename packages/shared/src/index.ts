// Mirrors supabase/migrations; keep the two in sync.

export type TransactionType = "income" | "expense" | "transfer";
export type CategoryType = Exclude<TransactionType, "transfer">;
export type AccountType =
  | "cash"
  | "bank"
  | "e_wallet"
  | "credit_card"
  | "savings"
  | "investment"
  | "other";

export interface Profile {
  id: string;
  fullName: string | null;
  /** ISO 4217 code, e.g. "PHP". */
  defaultCurrency: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** ISO 4217 code, e.g. "PHP". */
  currency: string;
  /** Minor units (cents) to avoid floating-point errors. */
  openingBalanceCents: number;
  isArchived: boolean;
}

/** From the `account_balances` view; balances are derived, never stored. */
export interface AccountBalance {
  accountId: string;
  currency: string;
  balanceCents: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  isArchived: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  /** Always null for transfers. */
  categoryId: string | null;
  /** Destination account; set only for transfers. */
  transferAccountId: string | null;
  type: TransactionType;
  /** Minor units (cents), always positive; `type` gives direction. */
  amountCents: number;
  note: string | null;
  /** Calendar date, YYYY-MM-DD. */
  occurredOn: string;
}

/** A monthly spending limit on one expense category. */
export interface Budget {
  id: string;
  categoryId: string;
  amountCents: number;
  currency: string;
}

export function formatMoney(cents: number, currency = "USD", locale?: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
