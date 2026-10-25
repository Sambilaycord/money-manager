import { centsToAmountInput } from "./money";
import type { TransactionType, ValidTransaction } from "./transactions";

/** A transaction with the names a list shows beside it. */
export interface TransactionListItem extends ValidTransaction {
  id: string;
  /** The account's currency, which every amount on it is stored in. */
  currency: string;
  accountName: string;
  transferAccountName: string | null;
  categoryName: string | null;
}

/** Stands for "no category" in the category filter, alongside real category ids. */
export const UNCATEGORISED = "none";

export const SEARCH_MAX_LENGTH = 100;

/**
 * What to leave out, rather than what to keep, so everything shows by default
 * and an account or category added later shows up without anyone opting in.
 */
export interface TransactionFilters {
  search: string;
  hiddenAccountIds: readonly string[];
  hiddenTypes: readonly TransactionType[];
  /** Category ids, plus UNCATEGORISED. */
  hiddenCategoryIds: readonly string[];
  /** Earliest day to show, YYYY-MM-DD inclusive; null for no lower bound. */
  dateFrom: string | null;
  /** Latest day to show, YYYY-MM-DD inclusive; null for no upper bound. */
  dateTo: string | null;
}

export const NO_TRANSACTION_FILTERS: TransactionFilters = {
  search: "",
  hiddenAccountIds: [],
  hiddenTypes: [],
  hiddenCategoryIds: [],
  dateFrom: null,
  dateTo: null,
};

/** Trims, collapses spaces, and caps the length, so the URL and the matching agree. */
export function normalizeSearch(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_LENGTH);
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return (
    filters.search !== "" ||
    filters.hiddenAccountIds.length > 0 ||
    filters.hiddenTypes.length > 0 ||
    filters.hiddenCategoryIds.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null
  );
}

function searchableText(transaction: TransactionListItem): string {
  return [
    transaction.note,
    transaction.categoryName,
    transaction.accountName,
    transaction.transferAccountName,
    // So "1250" and "1250.50" find an amount of 1,250.50.
    centsToAmountInput(transaction.amountCents),
  ]
    .filter((field): field is string => field !== null)
    .join(" ")
    .toLowerCase();
}

/**
 * Every word of the search must appear somewhere in `text`, in any order.
 * Commas are ignored in the search so "1,250" finds an amount written 1250.
 */
export function matchesSearchText(text: string, search: string): boolean {
  const words = normalizeSearch(search).toLowerCase().split(" ").filter(Boolean);
  const haystack = text.toLowerCase();
  return words.every((word) => haystack.includes(word.replace(/,/g, "")));
}

function matchesSearch(transaction: TransactionListItem, search: string): boolean {
  return matchesSearchText(searchableText(transaction), search);
}

/** A transfer touches two accounts; it stays visible while either one is shown. */
function matchesAccounts(transaction: TransactionListItem, hidden: readonly string[]): boolean {
  if (!hidden.includes(transaction.accountId)) return true;
  return transaction.transferAccountId !== null && !hidden.includes(transaction.transferAccountId);
}

/** Transfers have no category, so the category filter never hides them. */
function matchesCategories(transaction: TransactionListItem, hidden: readonly string[]): boolean {
  if (transaction.type === "transfer") return true;
  return !hidden.includes(transaction.categoryId ?? UNCATEGORISED);
}

/** YYYY-MM-DD strings sort in date order, so plain comparison is enough. */
function matchesDates(
  transaction: TransactionListItem,
  from: string | null,
  to: string | null,
): boolean {
  return (from === null || transaction.occurredOn >= from) && (to === null || transaction.occurredOn <= to);
}

export function filterTransactions(
  transactions: readonly TransactionListItem[],
  filters: TransactionFilters,
): TransactionListItem[] {
  return transactions.filter(
    (transaction) =>
      !filters.hiddenTypes.includes(transaction.type) &&
      matchesAccounts(transaction, filters.hiddenAccountIds) &&
      matchesCategories(transaction, filters.hiddenCategoryIds) &&
      matchesDates(transaction, filters.dateFrom, filters.dateTo) &&
      matchesSearch(transaction, filters.search),
  );
}

export interface Page<T> {
  items: T[];
  /** 1-based, clamped into range. */
  page: number;
  /** At least 1, so "page 1 of 1" holds for an empty list. */
  pageCount: number;
  /** 0-based index of the first item, for "showing 51–100". */
  firstIndex: number;
  total: number;
}

/** A page out of range (a stale link after deleting) lands on the nearest real one. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const firstIndex = (clampedPage - 1) * pageSize;
  return {
    items: items.slice(firstIndex, firstIndex + pageSize),
    page: clampedPage,
    pageCount,
    firstIndex,
    total: items.length,
  };
}
