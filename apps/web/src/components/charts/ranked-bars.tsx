import { formatMoney } from "@money-manager/shared";

export interface RankedRow {
  key: string;
  label: string;
  cents: number;
}

const DEFAULT_VISIBLE = 6;

/** The largest rows, then the rest folded into one "other" row so the list stays scannable. */
function visibleRows(rows: readonly RankedRow[], limit: number, otherNoun: string): RankedRow[] {
  if (rows.length <= limit) return [...rows];
  const rest = rows.slice(limit - 1);
  return [
    ...rows.slice(0, limit - 1),
    {
      key: "other",
      label: `${rest.length} other ${otherNoun}`,
      cents: rest.reduce((sum, row) => sum + row.cents, 0),
    },
  ];
}

interface RankedBarsProps {
  /** Largest first, all in `currency`. */
  rows: readonly RankedRow[];
  currency: string;
  /** Fill class for the bars, e.g. "bg-chart-expense". */
  barClassName: string;
  /** Plural for the folded row, e.g. "categories" in "3 other categories". */
  otherNoun: string;
  limit?: number;
}

/**
 * A ranked list with a bar per row. One series, so one colour; the amount and
 * share are written beside each bar so nothing depends on reading lengths.
 */
export function RankedBars({ rows, currency, barClassName, otherNoun, limit = DEFAULT_VISIBLE }: RankedBarsProps) {
  const totalCents = rows.reduce((sum, row) => sum + row.cents, 0);
  const shown = visibleRows(rows, limit, otherNoun);
  const largestCents = Math.max(1, ...shown.map((row) => row.cents));

  return (
    <ul className="flex flex-col gap-4">
      {shown.map((row) => {
        const share = totalCents > 0 ? Math.round((row.cents / totalCents) * 100) : 0;
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
                className={`h-full rounded-full ${barClassName}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
