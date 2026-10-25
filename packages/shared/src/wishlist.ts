// Wishlist: things to buy or save up for. What's saved toward an item is
// money set aside for it in real accounts (the set_asides table), and buying
// it records an expense. Mirrors the wishlist_items table.

import { isCalendarDate } from "./dates";
import { isUuid } from "./ids";
import {
  centsToAmountInput,
  isCurrencyCode,
  MAX_AMOUNT_TEXT,
  parseAmountToCents,
} from "./money";
import { validateAmount } from "./transactions";

/** Most wanted first; the order the form offers them. Mirrors the CHECK constraint. */
export const WISHLIST_PRIORITIES = ["high", "medium", "low"] as const;

export type WishlistPriority = (typeof WISHLIST_PRIORITIES)[number];

export const WISHLIST_PRIORITY_LABELS: Record<WishlistPriority, string> = {
  high: "Must have",
  medium: "Would be nice",
  low: "Someday",
};

/** Match the CHECK constraints on wishlist_items. */
export const WISHLIST_NAME_MAX_LENGTH = 120;
export const WISHLIST_NOTE_MAX_LENGTH = 500;
export const WISHLIST_URL_MAX_LENGTH = 2048;

export function isWishlistPriority(value: unknown): value is WishlistPriority {
  return typeof value === "string" && (WISHLIST_PRIORITIES as readonly string[]).includes(value);
}

export type UrlResult = { ok: true; url: string | null } | { ok: false; error: string };

/**
 * A pasted link made safe to store and click: "shopee.ph/item" gains
 * https://, and anything that isn't an ordinary web address is refused, so a
 * stored link can never run script when clicked. Empty means no link.
 */
export function normalizeWishlistUrl(text: string): UrlResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, url: null };
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, error: "Enter the link as a web address, like shopee.ph/item." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only web links (http or https) can be saved." };
  }
  // A real site has a dotted host name; this catches typos like "https://shopee".
  if (!parsed.hostname.includes(".")) {
    return { ok: false, error: "Enter the link as a web address, like shopee.ph/item." };
  }
  if (parsed.href.length > WISHLIST_URL_MAX_LENGTH) {
    return { ok: false, error: "That link is too long to save." };
  }
  return { ok: true, url: parsed.href };
}

/** "https://www.lazada.com.ph/products/x" → "lazada.com.ph", for a compact link label. */
export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** What the add and edit forms send, before any of it is trusted. */
export interface WishlistInput {
  name: string;
  url: string;
  /** Empty when the price isn't known yet. */
  price: string;
  currency: string;
  priority: string;
  /** YYYY-MM-DD, or empty. */
  wantBy: string;
  note: string;
}

export interface ValidWishlistItem {
  name: string;
  url: string | null;
  priceCents: number | null;
  currency: string;
  priority: WishlistPriority;
  wantBy: string | null;
  note: string | null;
}

export type WishlistInputResult =
  | { ok: true; item: ValidWishlistItem }
  | { ok: false; error: string };

type CentsResult = { ok: true; cents: number | null } | { ok: false; error: string };

/** An optional amount: empty is null; otherwise a number that fits in storage. */
function optionalCents(text: string, what: string): CentsResult {
  if (!text) return { ok: true, cents: null };
  const amount = parseAmountToCents(text);
  if (amount.ok) return { ok: true, cents: amount.cents };
  return {
    ok: false,
    error:
      amount.reason === "too_large"
        ? `That's more than the largest amount we can store (${MAX_AMOUNT_TEXT}).`
        : `Enter the ${what} as a number, like 2,499.`,
  };
}

export function validateWishlistInput(input: WishlistInput): WishlistInputResult {
  const name = input.name.trim().replace(/\s+/g, " ");
  const currency = input.currency.trim().toUpperCase();
  const wantBy = input.wantBy.trim();
  const note = input.note.trim();

  if (!name) return { ok: false, error: "Enter what you want." };
  if (name.length > WISHLIST_NAME_MAX_LENGTH) {
    return { ok: false, error: `Keep the name to ${WISHLIST_NAME_MAX_LENGTH} characters or fewer.` };
  }

  const url = normalizeWishlistUrl(input.url);
  if (!url.ok) return url;

  const price = optionalCents(input.price.trim(), "price");
  if (!price.ok) return price;
  if (price.cents === 0) return { ok: false, error: "Leave the price empty if you don't know it yet." };

  if (!isCurrencyCode(currency)) return { ok: false, error: "Choose a currency from the list." };
  if (!isWishlistPriority(input.priority)) return { ok: false, error: "Choose how much you want it." };
  if (wantBy && !isCalendarDate(wantBy)) {
    return { ok: false, error: "Enter a valid date, or leave it empty." };
  }
  if (note.length > WISHLIST_NOTE_MAX_LENGTH) {
    return { ok: false, error: `Keep the note to ${WISHLIST_NOTE_MAX_LENGTH} characters or fewer.` };
  }

  return {
    ok: true,
    item: {
      name,
      url: url.url,
      priceCents: price.cents,
      currency,
      priority: input.priority,
      wantBy: wantBy || null,
      note: note || null,
    },
  };
}

/** A saved item as the form fields that would recreate it, for prefilling the edit form. */
export function wishlistToInput(item: ValidWishlistItem): WishlistInput {
  return {
    name: item.name,
    url: item.url ?? "",
    price: item.priceCents === null ? "" : centsToAmountInput(item.priceCents),
    currency: item.currency,
    priority: item.priority,
    wantBy: item.wantBy ?? "",
    note: item.note ?? "",
  };
}

export function blankWishlistInput(currency: string): WishlistInput {
  return {
    name: "",
    url: "",
    price: "",
    currency,
    priority: "medium",
    wantBy: "",
    note: "",
  };
}

export interface WishlistProgress {
  /** saved ÷ price, from 0 to 1; null without a price. */
  ratio: number | null;
  /** Still to save; null without a price, zero once fully saved. */
  remainingCents: number | null;
  isFullySaved: boolean;
}

/** `savedCents` is what's set aside for the item across accounts. */
export function wishlistProgress(item: {
  priceCents: number | null;
  savedCents: number;
}): WishlistProgress {
  if (item.priceCents === null) return { ratio: null, remainingCents: null, isFullySaved: false };
  const remainingCents = Math.max(item.priceCents - item.savedCents, 0);
  return {
    ratio: Math.min(item.savedCents / item.priceCents, 1),
    remainingCents,
    isFullySaved: remainingCents === 0,
  };
}

export interface WishlistTotals {
  currency: string;
  /** Sum of known prices. */
  priceCents: number;
  savedCents: number;
  /** What's still to save across priced items; saving extra on one never offsets another. */
  neededCents: number;
}

/** Per currency, since prices in different currencies can't be added without a rate. */
export function wishlistTotalsByCurrency(
  items: readonly { priceCents: number | null; savedCents: number; currency: string }[],
): WishlistTotals[] {
  const totals = new Map<string, WishlistTotals>();
  for (const item of items) {
    const current = totals.get(item.currency) ?? {
      currency: item.currency,
      priceCents: 0,
      savedCents: 0,
      neededCents: 0,
    };
    totals.set(item.currency, {
      ...current,
      priceCents: current.priceCents + (item.priceCents ?? 0),
      savedCents: current.savedCents + item.savedCents,
      neededCents: current.neededCents + (wishlistProgress(item).remainingCents ?? 0),
    });
  }
  return [...totals.values()];
}

/** Most wanted first, then soonest wanted (undated last), then by name. */
export function compareWishlistItems(
  a: Pick<ValidWishlistItem, "priority" | "wantBy" | "name">,
  b: Pick<ValidWishlistItem, "priority" | "wantBy" | "name">,
): number {
  const byPriority = WISHLIST_PRIORITIES.indexOf(a.priority) - WISHLIST_PRIORITIES.indexOf(b.priority);
  if (byPriority !== 0) return byPriority;
  if (a.wantBy !== b.wantBy) {
    if (a.wantBy === null) return 1;
    if (b.wantBy === null) return -1;
    return a.wantBy.localeCompare(b.wantBy);
  }
  return a.name.localeCompare(b.name);
}

export interface WishlistPurchaseInput {
  accountId: string;
  /** What was actually paid; often the listed price. */
  amount: string;
  /** YYYY-MM-DD. */
  boughtOn: string;
  /** Empty for uncategorised. */
  categoryId: string;
}

export interface ValidWishlistPurchase {
  accountId: string;
  amountCents: number;
  boughtOn: string;
  categoryId: string | null;
}

export type WishlistPurchaseResult =
  | { ok: true; purchase: ValidWishlistPurchase }
  | { ok: false; error: string };

/** Checks the shape of a purchase; the account's currency is the database's to confirm. */
export function validateWishlistPurchase(input: WishlistPurchaseInput): WishlistPurchaseResult {
  // Lowercased to match how Postgres returns uuids.
  const accountId = input.accountId.trim().toLowerCase();
  const categoryId = input.categoryId.trim().toLowerCase();
  const boughtOn = input.boughtOn.trim();

  if (!isUuid(accountId)) return { ok: false, error: "Choose the account you paid from." };
  const amount = validateAmount(input.amount.trim());
  if (!amount.ok) return amount;
  if (!isCalendarDate(boughtOn)) return { ok: false, error: "Enter a valid date." };
  if (categoryId && !isUuid(categoryId)) return { ok: false, error: "Choose a category from the list." };

  return {
    ok: true,
    purchase: { accountId, amountCents: amount.cents, boughtOn, categoryId: categoryId || null },
  };
}
