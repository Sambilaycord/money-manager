import "server-only";
import { isCurrencyCode, parseExchangeRates, type ExchangeRates } from "@money-manager/shared";
import { cacheLife } from "next/cache";

// Free, keyless, and covers every currency the currency picker offers. Its
// terms ask for a visible credit link (EXCHANGE_RATES_PROVIDER), which
// ConversionNote and the calculator's converter render.
const RATES_URL = "https://open.er-api.com/v6/latest/";

const FETCH_TIMEOUT_MS = 5000;

async function fetchRates(base: string): Promise<ExchangeRates> {
  "use cache";
  // The provider refreshes once a day; a few hours keeps us close without
  // calling it on every page view.
  cacheLife("hours");

  const response = await fetch(`${RATES_URL}${base}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Exchange rates request failed with ${response.status}`);
  const rates = parseExchangeRates(await response.json());
  if (!rates || rates.base !== base) throw new Error("Exchange rates response was not in the expected shape");
  return rates;
}

/**
 * Today's rates against `base`, or null when they can't be loaded. Callers
 * then fall back to per-currency totals, so an outage never shows a wrong
 * number. Failures throw inside the cached function and are caught out here,
 * so a failure isn't cached for hours.
 */
export async function getExchangeRates(base: string): Promise<ExchangeRates | null> {
  if (!isCurrencyCode(base)) return null;
  try {
    return await fetchRates(base);
  } catch (error) {
    console.error(`Couldn't load exchange rates for ${base}; showing totals per currency`, error);
    return null;
  }
}
