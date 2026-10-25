import { getDefaultCurrency } from "@/lib/accounts";
import { getExchangeRates } from "@/lib/exchange-rates";
import { FloatingCalculator } from "./floating-calculator";

/** The floating calculator with today's rates for its Convert tab, against the person's default currency. */
export async function FloatingCalculatorWithRates() {
  const rates = await getExchangeRates(await getDefaultCurrency());
  return <FloatingCalculator rates={rates} />;
}
