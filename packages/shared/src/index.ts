import type { AccountType } from "./accounts";
import type { BudgetPeriod } from "./budgets";
import type { CategoryType, TransactionType } from "./transactions";

// Mirrors supabase/migrations; keep the two in sync.

export type { Database } from "./database.types";
export * from "./accounts";
export * from "./auth";
export * from "./brands";
export * from "./budgets";
export * from "./categories";
export * from "./colors";
export * from "./dates";
export * from "./devices";
export * from "./ids";
export * from "./money";
export * from "./money-picture";
export * from "./set-asides";
export * from "./profile";
export * from "./transaction-filters";
export * from "./totals";
export * from "./transactions";
export * from "./utang";
export * from "./wishlist";

export interface Profile {
  id: string;
  fullName: string | null;
  /** ISO 4217 code, e.g. "PHP". */
  defaultCurrency: string;
  /** The current picture in the avatars bucket, "<user id>/<file>"; null for initials. */
  avatarPath: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** ISO 4217 code, e.g. "PHP". */
  currency: string;
  /** Minor units (cents) to avoid floating-point errors. */
  openingBalanceCents: number;
  /** The bank or e-wallet holding it, e.g. "GoTyme Bank"; null for cash and the like. */
  institution: string | null;
  /** #RRGGBB; null means the default colour for the account type. */
  color: string | null;
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
  /** The limit for one `period`. */
  amountCents: number;
  currency: string;
  period: BudgetPeriod;
}
