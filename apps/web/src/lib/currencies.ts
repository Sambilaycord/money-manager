import { listCurrencyCodes } from "@money-manager/shared";

export interface CurrencyOption {
  code: string;
  name: string;
  /** Null when the currency has no symbol of its own beyond its code. */
  symbol: string | null;
}

function symbolOf(code: string): string | null {
  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  const symbol = parts.find((part) => part.type === "currency")?.value ?? code;
  return symbol === code ? null : symbol;
}

/**
 * Built on the server and handed to client forms as props: Node and each
 * browser ship different ICU data, so computing the list in the browser would
 * render different options than the server did.
 */
export function listCurrencyOptions(): CurrencyOption[] {
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  return listCurrencyCodes().map((code) => ({
    code,
    name: names.of(code) ?? code,
    symbol: symbolOf(code),
  }));
}
