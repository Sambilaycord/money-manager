import { isCalendarDate } from "./dates";
import { isUuid } from "./ids";
import { centsToAmountInput, MAX_AMOUNT_TEXT, parseAmountToCents } from "./money";

/** In the order the form offers them. */
export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type CategoryType = Exclude<TransactionType, "transfer">;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
};

/** Matches the transactions.note CHECK constraint. */
export const TRANSACTION_NOTE_MAX_LENGTH = 500;

export function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === "string" && (TRANSACTION_TYPES as readonly string[]).includes(value);
}

export function isCategoryType(value: unknown): value is CategoryType {
  return value === "income" || value === "expense";
}

/** What the add and edit transaction forms send, before any of it is trusted. */
export interface TransactionInput {
  type: string;
  amount: string;
  accountId: string;
  /** Only read for transfers. */
  transferAccountId: string;
  /** Empty for "uncategorised"; ignored for transfers. */
  categoryId: string;
  /** YYYY-MM-DD. */
  occurredOn: string;
  note: string;
}

export interface ValidTransaction {
  type: TransactionType;
  /** Always positive; `type` gives the direction. */
  amountCents: number;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  occurredOn: string;
  note: string | null;
}

export type TransactionInputResult =
  | { ok: true; transaction: ValidTransaction }
  | { ok: false; error: string };

type AmountResult = { ok: true; cents: number } | { ok: false; error: string };

function validateAmount(text: string): AmountResult {
  if (!text) return { ok: false, error: "Enter an amount." };
  const amount = parseAmountToCents(text);
  if (!amount.ok) {
    return {
      ok: false,
      error:
        amount.reason === "too_large"
          ? `That's more than the largest amount we can store (${MAX_AMOUNT_TEXT}).`
          : "Enter the amount as a number, like 1,250.50.",
    };
  }
  if (amount.cents === 0) return { ok: false, error: "The amount has to be more than zero." };
  return amount;
}

/**
 * Checks the shape of a transaction. Whether the accounts and category belong
 * to the person, share a currency, and match the type can only be answered by
 * the database, so callers check those separately.
 */
export function validateTransactionInput(input: TransactionInput): TransactionInputResult {
  // Lowercased to match how Postgres returns uuids, so ids compare as equal.
  const accountId = input.accountId.trim().toLowerCase();
  const transferAccountId = input.transferAccountId.trim().toLowerCase();
  const categoryId = input.categoryId.trim().toLowerCase();
  const occurredOn = input.occurredOn.trim();
  const note = input.note.trim();

  if (!isTransactionType(input.type)) {
    return { ok: false, error: "Choose expense, income, or transfer." };
  }
  const type = input.type;

  const amount = validateAmount(input.amount.trim());
  if (!amount.ok) return amount;

  if (!isUuid(accountId)) {
    return {
      ok: false,
      error: type === "transfer" ? "Choose the account the money comes from." : "Choose an account.",
    };
  }
  if (type === "transfer") {
    if (!isUuid(transferAccountId)) {
      return { ok: false, error: "Choose the account the money goes to." };
    }
    if (transferAccountId === accountId) {
      return { ok: false, error: "A transfer needs two different accounts." };
    }
  } else if (categoryId && !isUuid(categoryId)) {
    return { ok: false, error: "Choose a category from the list." };
  }
  if (!isCalendarDate(occurredOn)) return { ok: false, error: "Enter a valid date." };
  if (note.length > TRANSACTION_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the note to ${TRANSACTION_NOTE_MAX_LENGTH} characters or fewer.`,
    };
  }

  return {
    ok: true,
    transaction: {
      type,
      amountCents: amount.cents,
      accountId,
      transferAccountId: type === "transfer" ? transferAccountId : null,
      categoryId: type === "transfer" ? null : categoryId || null,
      occurredOn,
      note: note || null,
    },
  };
}

/** A saved transaction as the form fields that would recreate it, for prefilling the edit form. */
export function transactionToInput(transaction: ValidTransaction): TransactionInput {
  return {
    type: transaction.type,
    amount: centsToAmountInput(transaction.amountCents),
    accountId: transaction.accountId,
    transferAccountId: transaction.transferAccountId ?? "",
    categoryId: transaction.categoryId ?? "",
    occurredOn: transaction.occurredOn,
    note: transaction.note ?? "",
  };
}

/** The add form's starting values. */
export function blankTransactionInput(accountId: string, occurredOn: string): TransactionInput {
  return {
    type: "expense",
    amount: "",
    accountId,
    transferAccountId: "",
    categoryId: "",
    occurredOn,
    note: "",
  };
}
