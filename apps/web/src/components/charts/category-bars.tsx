import { formatMoney, type CategorySpending } from "@money-manager/shared";

const DEFAULT_VISIBLE = 6;

interface CategoryRow {
  key: string;
  label: string;
  cents: number;
}

/** The largest categories, then everything else folded into one row so the list stays scannable. */
function visibleRows(spending: readonly CategorySpending[], limit: number): CategoryRow[] {
  const toRow = (item: CategorySpending): CategoryRow => ({
    key: item.categoryId ?? "uncategorised",
    label: item.categoryName ?? "Uncategorised",
    cents: item.cents,
  });
  if (spending.length <= limit) return spending.map(toRow);

  const rest = spending.slice(limit - 1);
  return [
    ...spending.slice(0, limit - 1).map(toRow),
    {
      key: "other",
      label: `${rest.length} other categories`,
      cents: rest.reduce((sum, item) => sum + item.cents, 0),
    },
  ];
}

interface CategoryBarsProps {
  /** Largest first, all in `currency`. */
  spending: readonly CategorySpending[];
  currency: string;
  limit?: number;
}

/**
 * Spending per category as a ranked bar list. One series, so one colour; the
 * amount and share are written beside each bar so nothing depends on reading
 * bar lengths.
 */
export function CategoryBars({ spending, currency, limit = DEFAULT_VISIBLE }: CategoryBarsProps) {
  const totalCents = spending.reduce((sum, item) => sum + item.cents, 0);
  const rows = visibleRows(spending, limit);
  const largestCents = Math.max(...rows.map((row) => row.cents));

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => {
        const share = Math.round((row.cents / totalCents) * 100);
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{row.label}</span>
              <span className="shrink-0 tabular-nums">
                {formatMoney(row.cents, currency)}
                <span className="ml-2 inline-block w-9 text-right text-xs text-muted">{share}%</span>
              </span>
            </div>
            <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
              <div
                // Bar length is data, so it is set inline; scaled to the largest
                // row so the leader fills the track and the rest compare against it.
                style={{ width: `${(row.cents / largestCents) * 100}%` }}
                className="h-full rounded-full bg-chart-expense"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
