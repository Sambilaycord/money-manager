import type { CategorySpending } from "@money-manager/shared";
import { RankedBars } from "./ranked-bars";

interface CategoryBarsProps {
  /** Largest first, all in `currency`. */
  spending: readonly CategorySpending[];
  currency: string;
  limit?: number;
}

/** Spending per category as a ranked bar list. */
export function CategoryBars({ spending, currency, limit }: CategoryBarsProps) {
  return (
    <RankedBars
      rows={spending.map((item) => ({
        key: item.categoryId ?? "uncategorised",
        label: item.categoryName ?? "Uncategorised",
        cents: item.cents,
      }))}
      currency={currency}
      barClassName="bg-chart-expense"
      otherNoun="categories"
      limit={limit}
    />
  );
}
