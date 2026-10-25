import { isCurrencyCode } from "./money";

/** Where the rates come from. Its free tier's terms ask for this visible credit link. */
export const EXCHANGE_RATES_PROVIDER = {
  name: "ExchangeRate-API",
  url: "https://www.exchangerate-api.com",
} as const;

/**
 * Exchange rates against one base currency, for showing totals that span
 * currencies. Display only: converted figures are never stored, and every
 * converted total is marked as approximate where it is shown.
 */
export interface ExchangeRates {
  base: string;
  /** How many units of each currency one unit of `base` buys. */
  rates: Readonly<Record<string, number>>;
  /** ISO timestamp of when the provider last updated the rates. */
  updatedAt: string;
}

/** `cents` of `from` in the rates' base currency, or null when there is no usable rate. */
export function convertToBase(cents: number, from: string, rates: ExchangeRates): number | null {
  if (from === rates.base) return cents;
  const rate = rates.rates[from];
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;
  // Rounded to whole minor units: the result is an estimate, but it is still
  // money, and money is always integer cents.
  return Math.round(cents / rate);
}

/** One unit of `from` expressed in the base currency, e.g. 63.65 for USD into PHP. */
export function baseValueOf(from: string, rates: ExchangeRates): number | null {
  const rate = rates.rates[from];
  return rate !== undefined && Number.isFinite(rate) && rate > 0 ? 1 / rate : null;
}

export interface Conversion {
  /** The currency everything was converted into. */
  target: string;
  /** Currencies that were converted, alphabetical. Empty when nothing needed converting. */
  convertedFrom: string[];
  /** Currencies left as they were because no rate was available. */
  unconverted: string[];
}

/**
 * Re-expresses each item in `target` so ordinary single-currency totals and
 * charts can run on the result. `convert` maps an item's amount fields
 * through the provided function; the helper then sets its currency. Items
 * whose currency has no rate (or every item, when `rates` is null) keep their
 * own currency, so callers still show them separately rather than drop them.
 */
export function convertItems<T extends { currency: string }>(
  items: readonly T[],
  rates: ExchangeRates | null,
  convert: (item: T, toTarget: (cents: number) => number) => T,
): { items: T[]; conversion: Conversion | null } {
  if (!rates) return { items: [...items], conversion: null };

  const convertedFrom = new Set<string>();
  const unconverted = new Set<string>();
  const converted = items.map((item) => {
    if (item.currency === rates.base) return item;
    if (baseValueOf(item.currency, rates) === null) {
      unconverted.add(item.currency);
      return item;
    }
    convertedFrom.add(item.currency);
    const toTarget = (cents: number) => convertToBase(cents, item.currency, rates) ?? cents;
    return { ...convert(item, toTarget), currency: rates.base };
  });

  return {
    items: converted,
    conversion: {
      target: rates.base,
      convertedFrom: [...convertedFrom].sort(),
      unconverted: [...unconverted].sort(),
    },
  };
}

/**
 * Checks a rates payload from outside the app before trusting it. Accepts the
 * open.er-api.com shape: { result: "success", base_code, rates, time_last_update_unix }.
 */
export function parseExchangeRates(payload: unknown): ExchangeRates | null {
  if (typeof payload !== "object" || payload === null) return null;
  if (!("result" in payload) || payload.result !== "success") return null;
  if (!("base_code" in payload) || typeof payload.base_code !== "string") return null;
  if (!isCurrencyCode(payload.base_code)) return null;
  if (!("rates" in payload) || typeof payload.rates !== "object" || payload.rates === null) return null;
  if (!("time_last_update_unix" in payload) || typeof payload.time_last_update_unix !== "number") {
    return null;
  }

  const rates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(payload.rates)) {
    if (/^[A-Z]{3}$/.test(code) && typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  }
  return {
    base: payload.base_code,
    rates,
    updatedAt: new Date(payload.time_last_update_unix * 1000).toISOString(),
  };
}

/** One summary for a page whose totals came from several conversions. */
export function mergeConversions(...conversions: (Conversion | null)[]): Conversion | null {
  const present = conversions.filter((conversion): conversion is Conversion => conversion !== null);
  const [first] = present;
  if (!first) return null;
  const union = (pick: (conversion: Conversion) => string[]) =>
    [...new Set(present.flatMap(pick))].sort();
  return {
    target: first.target,
    convertedFrom: union((conversion) => conversion.convertedFrom),
    unconverted: union((conversion) => conversion.unconverted),
  };
}

/**
 * `cents` of `from` in `to`, through the rates' base, rounded to whole minor
 * units. Null when either currency has no rate.
 */
export function convertBetween(cents: number, from: string, to: string, rates: ExchangeRates): number | null {
  const fromRate = from === rates.base ? 1 : rates.rates[from];
  const toRate = to === rates.base ? 1 : rates.rates[to];
  if (fromRate === undefined || toRate === undefined || !(fromRate > 0) || !(toRate > 0)) return null;
  return Math.round((cents * toRate) / fromRate);
}
