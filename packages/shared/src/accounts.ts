import { isAccountColor } from "./colors";
import {
  centsToAmountInput,
  isCurrencyCode,
  MAX_AMOUNT_TEXT,
  parseAmountToCents,
  type AmountParseResult,
} from "./money";

/** In the order account groups are shown. */
export const ACCOUNT_TYPES = [
  "bank",
  "savings",
  "debit_card",
  "credit_card",
  "e_wallet",
  "cash",
  "investment",
  "other",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, { singular: string; plural: string }> = {
  bank: { singular: "Bank account", plural: "Bank accounts" },
  savings: { singular: "Savings", plural: "Savings" },
  debit_card: { singular: "Debit card", plural: "Debit cards" },
  credit_card: { singular: "Credit card", plural: "Credit cards" },
  e_wallet: { singular: "E-wallet", plural: "E-wallets" },
  cash: { singular: "Cash", plural: "Cash" },
  investment: { singular: "Investment", plural: "Investments" },
  other: { singular: "Other", plural: "Other" },
};

/** Matches the accounts.name CHECK constraint. */
export const ACCOUNT_NAME_MAX_LENGTH = 80;
/** Matches the accounts.institution CHECK constraint. */
export const INSTITUTION_MAX_LENGTH = 60;

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && (ACCOUNT_TYPES as readonly string[]).includes(value);
}

/**
 * Accounts whose balance is money owed rather than money held. Their balance
 * is stored negative, so expenses push it further below zero and totals
 * across accounts net out debt without special cases.
 */
export function isLiabilityAccount(type: AccountType): boolean {
  return type === "credit_card";
}

/** What the add and edit account forms send, before any of it is trusted. */
export interface AccountInput {
  name: string;
  /** The bank or e-wallet holding the account; empty when there isn't one. */
  institution: string;
  type: string;
  currency: string;
  balance: string;
  /** Empty for "use the type default". */
  color: string;
}

export interface ValidAccount {
  name: string;
  institution: string | null;
  type: AccountType;
  currency: string;
  openingBalanceCents: number;
  color: string | null;
}

export type AccountInputResult = { ok: true; account: ValidAccount } | { ok: false; error: string };

export function validateAccountInput(input: AccountInput): AccountInputResult {
  const name = input.name.trim();
  const institution = input.institution.trim();
  const currency = input.currency.trim().toUpperCase();
  const balance = input.balance.trim();
  const color = input.color.trim().toUpperCase();

  if (!name) return { ok: false, error: "Give the account a name." };
  if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
    return { ok: false, error: `Keep the name to ${ACCOUNT_NAME_MAX_LENGTH} characters or fewer.` };
  }
  if (institution.length > INSTITUTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the bank or e-wallet to ${INSTITUTION_MAX_LENGTH} characters or fewer.`,
    };
  }
  if (!isAccountType(input.type)) return { ok: false, error: "Choose what kind of account this is." };
  if (!isCurrencyCode(currency)) return { ok: false, error: "Choose a currency from the list." };
  if (color && !isAccountColor(color)) return { ok: false, error: "Choose one of the colours." };

  const amount: AmountParseResult = balance ? parseAmountToCents(balance) : { ok: true, cents: 0 };
  if (!amount.ok) {
    return {
      ok: false,
      error:
        amount.reason === "too_large"
          ? `That's more than the largest balance we can store (${MAX_AMOUNT_TEXT}).`
          : "Enter the balance as a number, like 1,250.50.",
    };
  }

  return {
    ok: true,
    account: {
      name,
      institution: institution || null,
      type: input.type,
      currency,
      // The form asks how much is owed on a credit card; owing is stored as a
      // negative balance.
      openingBalanceCents: isLiabilityAccount(input.type) ? -amount.cents : amount.cents,
      color: color || null,
    },
  };
}

/**
 * A saved account as the form fields that would recreate it, for prefilling the
 * edit form. Credit cards go back to "amount owed", the positive figure the
 * form asks for.
 */
export function accountToInput(account: ValidAccount): AccountInput {
  const { openingBalanceCents, type } = account;
  return {
    name: account.name,
    institution: account.institution ?? "",
    type,
    currency: account.currency,
    balance: centsToAmountInput(isLiabilityAccount(type) ? -openingBalanceCents : openingBalanceCents),
    color: account.color ?? "",
  };
}

/** The add form's starting values. */
export function blankAccountInput(currency: string): AccountInput {
  return { name: "", institution: "", type: "bank", currency, balance: "", color: "" };
}
