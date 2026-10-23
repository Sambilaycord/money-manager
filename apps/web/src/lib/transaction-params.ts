import {
  isCalendarDate,
  isMonth,
  isTransactionType,
  isUuid,
  monthOf,
  normalizeSearch,
  UNCATEGORISED,
  type TransactionFilters,
} from "@money-manager/shared";

// Pure and free of server-only imports: the page reads these parameters and
// the client-side search and filter controls write them.

/** Everything the transactions page reads from its URL. */
export interface TransactionPageParams {
  /** YYYY-MM. */
  month: string;
  /** 1-based; clamped to the real page count once the list is known. */
  page: number;
  filters: TransactionFilters;
}

/** URL parameter names, shared by the server that reads them and the controls that write them. */
export const TRANSACTION_PARAMS = {
  month: "month",
  page: "page",
  search: "q",
  hiddenAccount: "hide_account",
  hiddenType: "hide_type",
  hiddenCategory: "hide_category",
  dateFrom: "from",
  dateTo: "to",
} as const;

type SearchParams = Record<string, string | string[] | undefined>;

function allValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function firstValue(value: string | string[] | undefined): string {
  return allValues(value)[0] ?? "";
}

function uniqueMatching<T extends string>(
  value: string | string[] | undefined,
  isValid: (candidate: string) => candidate is T,
): T[] {
  return [...new Set(allValues(value).map((candidate) => candidate.toLowerCase()))].filter(isValid);
}

function isCategoryFilterValue(value: string): value is string {
  return value === UNCATEGORISED || isUuid(value);
}

/** A day of `month`, or null: a range only ever narrows the month on screen. */
function dayInMonth(value: string, month: string): string | null {
  return isCalendarDate(value) && monthOf(value) === month ? value : null;
}

/**
 * The page's state from its URL. Anything malformed is dropped rather than
 * failing the page, since links get hand-edited and bookmarked.
 */
export function parseTransactionPageParams(
  searchParams: SearchParams,
  today: string,
): TransactionPageParams {
  const requestedMonth = firstValue(searchParams[TRANSACTION_PARAMS.month]);
  const month = isMonth(requestedMonth) ? requestedMonth : monthOf(today);
  const from = dayInMonth(firstValue(searchParams[TRANSACTION_PARAMS.dateFrom]), month);
  const to = dayInMonth(firstValue(searchParams[TRANSACTION_PARAMS.dateTo]), month);
  // A hand-edited link can put the ends the wrong way round.
  const [dateFrom, dateTo] = from && to && from > to ? [to, from] : [from, to];
  return {
    month,
    page: Number.parseInt(firstValue(searchParams[TRANSACTION_PARAMS.page]), 10) || 1,
    filters: {
      search: normalizeSearch(firstValue(searchParams[TRANSACTION_PARAMS.search])),
      hiddenAccountIds: uniqueMatching(searchParams[TRANSACTION_PARAMS.hiddenAccount], isUuid),
      hiddenTypes: uniqueMatching(searchParams[TRANSACTION_PARAMS.hiddenType], isTransactionType),
      hiddenCategoryIds: uniqueMatching(
        searchParams[TRANSACTION_PARAMS.hiddenCategory],
        isCategoryFilterValue,
      ),
      dateFrom,
      dateTo,
    },
  };
}

/** The URL for a page of the list, carrying every filter along. */
export function transactionsHref(params: TransactionPageParams): string {
  const query = new URLSearchParams({ [TRANSACTION_PARAMS.month]: params.month });
  if (params.filters.search) query.set(TRANSACTION_PARAMS.search, params.filters.search);
  for (const id of params.filters.hiddenAccountIds) query.append(TRANSACTION_PARAMS.hiddenAccount, id);
  for (const type of params.filters.hiddenTypes) query.append(TRANSACTION_PARAMS.hiddenType, type);
  for (const id of params.filters.hiddenCategoryIds) {
    query.append(TRANSACTION_PARAMS.hiddenCategory, id);
  }
  if (params.filters.dateFrom) query.set(TRANSACTION_PARAMS.dateFrom, params.filters.dateFrom);
  if (params.filters.dateTo) query.set(TRANSACTION_PARAMS.dateTo, params.filters.dateTo);
  if (params.page > 1) query.set(TRANSACTION_PARAMS.page, String(params.page));
  return `/transactions?${query}`;
}
