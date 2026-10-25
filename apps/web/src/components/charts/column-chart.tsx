export interface Column {
  key: string;
  /** Under the column, e.g. "Mon". */
  label: string;
  value: number;
  /** The value as people read it, e.g. "₱1,250.00". */
  display: string;
}

interface ColumnChartProps {
  columns: readonly Column[];
  /** Names the series for the hidden table and tooltips, e.g. "Average spent". */
  seriesLabel: string;
  /** Fill class for the columns, e.g. "bg-chart-expense". */
  barClassName: string;
}

/**
 * One series as columns from a shared baseline. The tallest column is labelled
 * directly; the rest show their value on hover or keyboard focus, and every
 * value is also in the table for screen readers.
 */
export function ColumnChart({ columns, seriesLabel, barClassName }: ColumnChartProps) {
  const max = Math.max(0, ...columns.map((column) => column.value));
  const peak = columns.find((column) => column.value === max && max > 0);

  return (
    <div>
      <div className="flex h-40 items-end gap-2 border-b border-border sm:gap-3">
        {columns.map((column) => (
          <div
            key={column.key}
            tabIndex={0}
            aria-label={`${column.label}: ${column.display}`}
            className="group relative flex h-full flex-1 items-end justify-center rounded-t-lg outline-none hover:bg-surface-sunken/70 focus-visible:bg-surface-sunken/70"
          >
            {column === peak && (
              <span
                aria-hidden="true"
                style={{ bottom: `${(column.value / max) * 100}%` }}
                className="absolute mb-1 text-[11px] font-semibold whitespace-nowrap tabular-nums group-hover:hidden group-focus-visible:hidden"
              >
                {column.display}
              </span>
            )}
            <div
              aria-hidden="true"
              // Height is data, so it's set inline; a fixed 24px width keeps
              // the column a mark, not a block, however wide the slot is.
              style={{ height: `${max > 0 ? (column.value / max) * 100 : 0}%` }}
              className={`w-6 rounded-t ${barClassName}`}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg border border-border bg-surface px-2 py-1 text-xs shadow-overlay group-hover:block group-focus-visible:block"
            >
              <span className="font-semibold tabular-nums">{column.display}</span>{" "}
              <span className="text-muted">{column.label}</span>
            </span>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-2 text-center text-xs text-muted sm:gap-3">
        {columns.map((column) => (
          <span key={column.key} className="flex-1">
            {column.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{seriesLabel}</caption>
        <tbody>
          {columns.map((column) => (
            <tr key={column.key}>
              <th scope="row">{column.label}</th>
              <td>{column.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
