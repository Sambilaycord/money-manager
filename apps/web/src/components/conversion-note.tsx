import {
  baseValueOf,
  EXCHANGE_RATES_PROVIDER,
  type Conversion,
  type ExchangeRates,
} from "@money-manager/shared";
import { GlobeIcon } from "@/components/icons";

const updatedFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

/** "1 USD = ₱63.65", or null when there is no rate for `code`. */
export function formatExchangeRate(code: string, rates: ExchangeRates): string | null {
  const value = baseValueOf(code, rates);
  if (value === null) return null;
  // Enough digits that small currencies don't round to zero (1 JPY ≈ ₱0.4057).
  const formatted = new Intl.NumberFormat("en", {
    style: "currency",
    currency: rates.base,
    maximumSignificantDigits: 4,
  }).format(value);
  return `1 ${code} = ${formatted}`;
}

/** Marks a total as converted: "≈ ₱38,883.25". Unchanged when nothing was converted. */
export function approximate(text: string, conversion: Conversion | null, currency: string): string {
  const isConverted = conversion !== null && conversion.convertedFrom.length > 0 && currency === conversion.target;
  return isConverted ? `≈ ${text}` : text;
}

interface ConversionNoteProps {
  conversion: Conversion | null;
  rates: ExchangeRates | null;
  /** Every currency the totals on this page involve, before conversion. */
  currencies: readonly string[];
  className?: string;
}

/**
 * Says when totals on a page were converted, at what rates and as of when,
 * so a "≈ ₱" figure is never mistaken for money actually held in pesos.
 * Renders nothing when everything was already in one currency.
 */
export function ConversionNote({ conversion, rates, currencies, className = "" }: ConversionNoteProps) {
  const isMixed = new Set(currencies).size > 1;
  if (!isMixed) return null;

  if (!conversion || !rates) {
    return (
      <p className={`flex items-start gap-2 text-xs text-muted ${className}`}>
        <GlobeIcon width={14} height={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Exchange rates couldn&apos;t be loaded, so totals are shown separately for each currency.
      </p>
    );
  }
  if (conversion.convertedFrom.length === 0 && conversion.unconverted.length === 0) return null;

  const rateList = conversion.convertedFrom
    .map((code) => formatExchangeRate(code, rates))
    .filter((text): text is string => text !== null);

  return (
    <p className={`flex items-start gap-2 text-xs text-muted ${className}`}>
      <GlobeIcon width={14} height={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        {conversion.convertedFrom.length > 0 && (
          <>
            ≈ Totals include {conversion.convertedFrom.join(", ")} converted to {conversion.target} at
            today&apos;s rates ({rateList.join(" · ")}). Rates updated{" "}
            {updatedFormat.format(new Date(rates.updatedAt))} by{" "}
            <a href={EXCHANGE_RATES_PROVIDER.url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
              {EXCHANGE_RATES_PROVIDER.name}
            </a>
            .{" "}
          </>
        )}
        {conversion.unconverted.length > 0 &&
          `No rate is available for ${conversion.unconverted.join(", ")}, so those are shown separately.`}
      </span>
    </p>
  );
}
