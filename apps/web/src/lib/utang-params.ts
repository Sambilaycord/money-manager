import {
  isUtangDirection,
  isUtangDueState,
  normalizeSearch,
  type UtangDirection,
  type UtangFilters,
} from "@money-manager/shared";
import { LIST_PAGE_PARAM, LIST_SEARCH_PARAM } from "@/components/list/list-params";

// Pure and free of server-only imports: the utang pages read these parameters
// and the client-side search and filter controls write them.

export const UTANG_PATH = "/utang";

/** The full-list pages under /utang: one per column of the main page, plus settled. */
export type UtangListView = "owed-to-you" | "you-owe" | "settled";

export const UTANG_LIST_VIEWS: Record<
  UtangListView,
  { path: string; title: string; description: string; direction: UtangDirection | null }
> = {
  "owed-to-you": {
    path: "/utang/owed-to-you",
    title: "Owed to you",
    description: "Everyone who still owes you, most urgent first.",
    direction: "owed_to_me",
  },
  "you-owe": {
    path: "/utang/you-owe",
    title: "You owe",
    description: "Everyone you still owe, most urgent first.",
    direction: "i_owe",
  },
  settled: {
    path: "/utang/settled",
    title: "Settled",
    description: "Utang that's been paid back in full, newest first.",
    direction: null,
  },
};

export const UTANG_PARAMS = {
  page: LIST_PAGE_PARAM,
  search: LIST_SEARCH_PARAM,
  hiddenDirection: "hide_direction",
  hiddenCurrency: "hide_currency",
  hiddenDue: "hide_due",
  /** The main page's per-column pages. */
  owedToYouPage: "owed_page",
  youOwePage: "owe_page",
} as const;

export interface UtangListParams {
  /** 1-based; clamped to the real page count once the list is known. */
  page: number;
  filters: UtangFilters;
}

type SearchParams = Record<string, string | string[] | undefined>;

function allValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** A 1-based page number from the URL; anything else is page 1. */
export function readPage(searchParams: SearchParams, param: string): number {
  return Number.parseInt(allValues(searchParams[param])[0] ?? "", 10) || 1;
}

/**
 * A list page's state from its URL. Anything malformed is dropped rather than
 * failing the page, since links get hand-edited and bookmarked.
 */
export function parseUtangListParams(searchParams: SearchParams): UtangListParams {
  const currencies = allValues(searchParams[UTANG_PARAMS.hiddenCurrency])
    .map((code) => code.toUpperCase())
    .filter((code) => /^[A-Z]{3}$/.test(code));
  return {
    page: readPage(searchParams, UTANG_PARAMS.page),
    filters: {
      search: normalizeSearch(allValues(searchParams[UTANG_PARAMS.search])[0] ?? ""),
      hiddenDirections: [
        ...new Set(allValues(searchParams[UTANG_PARAMS.hiddenDirection]).filter(isUtangDirection)),
      ],
      hiddenCurrencies: [...new Set(currencies)],
      hiddenDueStates: [
        ...new Set(allValues(searchParams[UTANG_PARAMS.hiddenDue]).filter(isUtangDueState)),
      ],
    },
  };
}

/** The URL for a page of one list, carrying every filter along. */
export function utangListHref(view: UtangListView, params: UtangListParams): string {
  const query = new URLSearchParams();
  const { filters } = params;
  if (filters.search) query.set(UTANG_PARAMS.search, filters.search);
  for (const direction of filters.hiddenDirections) query.append(UTANG_PARAMS.hiddenDirection, direction);
  for (const currency of filters.hiddenCurrencies) query.append(UTANG_PARAMS.hiddenCurrency, currency);
  for (const state of filters.hiddenDueStates) query.append(UTANG_PARAMS.hiddenDue, state);
  if (params.page > 1) query.set(UTANG_PARAMS.page, String(params.page));
  const queryString = query.toString();
  const { path } = UTANG_LIST_VIEWS[view];
  return queryString ? `${path}?${queryString}` : path;
}

/** The main page with each column on the given page; page 1 is left out of the URL. */
export function utangHref(pages: { owedToYou: number; youOwe: number }): string {
  const query = new URLSearchParams();
  if (pages.owedToYou > 1) query.set(UTANG_PARAMS.owedToYouPage, String(pages.owedToYou));
  if (pages.youOwe > 1) query.set(UTANG_PARAMS.youOwePage, String(pages.youOwe));
  const queryString = query.toString();
  return queryString ? `${UTANG_PATH}?${queryString}` : UTANG_PATH;
}
