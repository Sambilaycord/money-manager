export function formatMoney(cents: number, currency = "USD", locale?: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

/** "₱12K", for chart axes where a full amount would crowd the label. */
export function formatMoneyCompact(cents: number, currency = "USD", locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * 999,999,999,999.99. Far above any real personal balance, and low enough that
 * sums of many amounts stay exact as JavaScript numbers (which lose precision
 * past 2^53) and fit the database's bigint columns, which enforce the same cap.
 */
export const MAX_AMOUNT_CENTS = 99_999_999_999_999;
/** MAX_AMOUNT_CENTS as people read it, for error messages. */
export const MAX_AMOUNT_TEXT = (MAX_AMOUNT_CENTS / 100).toLocaleString("en", {
  minimumFractionDigits: 2,
});
const MAX_WHOLE_DIGITS = 12;

export type AmountParseResult =
  | { ok: true; cents: number }
  | { ok: false; reason: "invalid" | "too_large" };

const AMOUNT_PATTERN = /^(\d*)(?:\.(\d{0,2}))?$/;

/**
 * Parses what a person types or pastes into an amount field ("1,250.5") into
 * cents. Works on the digits directly rather than through parseFloat, so typed
 * amounts never pick up floating-point error. Accepts digit-grouping commas and
 * spaces; rejects signs, letters, and more than two decimals.
 */
export function parseAmountToCents(input: string): AmountParseResult {
  const match = AMOUNT_PATTERN.exec(input.replace(/[\s,]/g, ""));
  const [, whole = "", fraction = ""] = match ?? [];
  if (!match || (whole === "" && fraction === "")) return { ok: false, reason: "invalid" };

  // Checked on the string first: Number() of a 21-digit string has already
  // lost the exact value.
  const significantWhole = whole.replace(/^0+/, "");
  if (significantWhole.length > MAX_WHOLE_DIGITS) return { ok: false, reason: "too_large" };

  const cents = Number(significantWhole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  if (cents > MAX_AMOUNT_CENTS) return { ok: false, reason: "too_large" };
  return { ok: true, cents };
}

/**
 * The inverse of parseAmountToCents for prefilling an edit form: 125050 becomes
 * "1250.50". Built from integer division, not cents / 100, so the text is the
 * exact stored value.
 */
export function centsToAmountInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

// Intl.NumberFormat accepts any well-formed code ("ABC"), so it can't tell a
// real currency from a typo. Older Hermes builds lack supportedValuesOf; there
// the format check is all we get, and the database still enforces the shape.
const KNOWN_CURRENCIES =
  typeof Intl.supportedValuesOf === "function" ? new Set(Intl.supportedValuesOf("currency")) : null;

/** ISO 4217 codes the runtime knows, alphabetical; empty where it can't list them. */
export function listCurrencyCodes(): string[] {
  return KNOWN_CURRENCIES ? [...KNOWN_CURRENCIES] : [];
}

/** An ISO 4217 code, e.g. "PHP". */
export function isCurrencyCode(value: string): boolean {
  if (!/^[A-Z]{3}$/.test(value)) return false;
  return KNOWN_CURRENCIES?.has(value) ?? true;
}
