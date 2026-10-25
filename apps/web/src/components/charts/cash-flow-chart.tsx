import {
  formatMoney,
  formatMoneyCompact,
  formatMonthLabel,
  formatMonthShort,
  type MonthCashFlow,
} from "@money-manager/shared";

const SERIES = [
  { key: "incomeCents", label: "Income", barClassName: "bg-chart-income" },
  { key: "expenseCents", label: "Spending", barClassName: "bg-chart-expense" },
] as const;

/** Rounds up to 1, 2, 2.5 or 5 times a power of ten, so axis labels read as round numbers. */
function niceCeiling(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= value) ?? 10;
  return step * magnitude;
}

function Legend() {
  return (
    <ul className="flex items-center gap-4 text-sm text-muted">
      {SERIES.map((series) => (
        <li key={series.key} className="flex items-center gap-2">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${series.barClassName}`} />
          {series.label}
        </li>
      ))}
    </ul>
  );
}

function MonthTooltip({ flow, currency }: { flow: MonthCashFlow; currency: string }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-44 -translate-x-1/2 rounded-xl border border-border bg-surface p-3 text-xs shadow-overlay group-hover:block">
      <p className="mb-2 font-semibold">{formatMonthLabel(flow.month)}</p>
      {SERIES.map((series) => (
        <p key={series.key} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted">
            <span className={`size-2 rounded-full ${series.barClassName}`} />
            {series.label}
          </span>
          <span className="tabular-nums">{formatMoney(flow[series.key], currency)}</span>
        </p>
      ))}
      <p className="mt-1.5 flex justify-between gap-3 border-t border-border pt-1.5">
        <span className="text-muted">Net</span>
        <span className="tabular-nums">
          {formatMoney(flow.incomeCents - flow.expenseCents, currency)}
        </span>
      </p>
    </div>
  );
}

interface CashFlowChartProps {
  /** Oldest first, all in `currency`; at least one month must have activity. */
  months: readonly MonthCashFlow[];
  currency: string;
}

/**
 * Income beside spending for each month, on one shared axis. The drawing is
 * hidden from screen readers in favour of the table that follows it.
 */
export function CashFlowChart({ months, currency }: CashFlowChartProps) {
  const axisMax = niceCeiling(
    Math.max(1, ...months.flatMap((flow) => [flow.incomeCents, flow.expenseCents])),
  );
  const gridlines = [1, 0.5];

  return (
    <div>
      <Legend />
      <div aria-hidden="true" className="mt-6 flex gap-3">
        <div className="relative w-12 shrink-0 text-right text-[11px] text-muted tabular-nums">
          {gridlines.map((fraction) => (
            <span
              key={fraction}
              style={{ bottom: `${fraction * 100}%` }}
              className="absolute right-0 translate-y-1/2"
            >
              {formatMoneyCompact(axisMax * fraction, currency)}
            </span>
          ))}
          <span className="absolute right-0 bottom-0 translate-y-1/2">0</span>
        </div>
        <div className="relative h-52 flex-1 border-b border-border">
          {gridlines.map((fraction) => (
            <div
              key={fraction}
              style={{ bottom: `${fraction * 100}%` }}
              className="absolute inset-x-0 border-t border-dashed border-border"
            />
          ))}
          <div className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
            {months.map((flow) => (
              <div
                key={flow.month}
                className="group relative flex h-full items-end justify-center gap-0.5 rounded-t-lg hover:bg-surface-sunken/70"
              >
                {SERIES.map((series) => (
                  <div
                    key={series.key}
                    style={{ height: `${(flow[series.key] / axisMax) * 100}%` }}
                    className={`w-3 rounded-t sm:w-4 ${series.barClassName}`}
                  />
                ))}
                <MonthTooltip flow={flow} currency={currency} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mt-2 ml-15 grid text-center text-xs text-muted"
        style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}
      >
        {months.map((flow) => (
          <span key={flow.month}>{formatMonthShort(flow.month)}</span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Income and spending by month, in {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Spending</th>
          </tr>
        </thead>
        <tbody>
          {months.map((flow) => (
            <tr key={flow.month}>
              <th scope="row">{formatMonthLabel(flow.month)}</th>
              <td>{formatMoney(flow.incomeCents, currency)}</td>
              <td>{formatMoney(flow.expenseCents, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
