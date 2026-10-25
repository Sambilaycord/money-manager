import "server-only";
import { HOME_TIME_ZONE, todayIn } from "@money-manager/shared";
import { cache } from "react";
import { getDefaultCurrency, listOpenAccounts, toMoneyAccountOption } from "@/lib/accounts";
import { listUtang } from "@/lib/utang";

/**
 * Everything the utang pages render from. cache() so a page's header button
 * and its body share one set of queries per request.
 */
export const loadUtang = cache(async () => {
  const [defaultCurrency, accounts] = await Promise.all([getDefaultCurrency(), listOpenAccounts()]);
  // Read after the first query: under Cache Components, "today" has to come
  // after request-time data rather than during prerendering.
  const today = todayIn(HOME_TIME_ZONE);
  const utang = await listUtang(today);
  // Offered as name suggestions in the form, so one person is spelled one way.
  const knownPeople = [...new Set(utang.map((item) => item.person))].sort((a, b) =>
    a.localeCompare(b),
  );
  return { defaultCurrency, today, utang, knownPeople, accounts: accounts.map(toMoneyAccountOption) };
});
