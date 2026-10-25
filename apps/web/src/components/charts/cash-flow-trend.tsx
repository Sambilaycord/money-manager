import {
  formatMoney,
  formatMonthLabel,
  formatMonthShort,
  type MonthCashFlow,
} from "@money-manager/shared";
import { Sparkline } from "./sparkline";

const MEASURES = {
  income: {
    label: "Income",
    accentClassName: "bg-chart-income",
    pick: (flow: MonthCashFlow) => flow.incomeCents,
  },
  expense: {
    label: "Spending",
    accentClassName: "bg-chart-expense",
    pick: (flow: MonthCashFlow) => flow.expenseCents,
  },
  net: {
    label: "Net",
    accentClassName: "bg-sky-ink",
    pick: (flow: MonthCashFlow) => flow.incomeCents - flow.expenseCents,
  },
} as const;

export type CashFlowMeasure = keyof typeof MEASURES;

interface CashFlowTrendProps {
  /** Oldest first, all in `currency`; the last month is the one the card is about. */
  months: readonly MonthCashFlow[];
  currency: string;
  measure: CashFlowMeasure;
}

/** A stat card's month-by-month trend for one cash-flow measure, with its range named below. */
export function CashFlowTrend({ months, currency, measure }: CashFlowTrendProps) {
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last || months.length < 2) return null;

  const { label, accentClassName, pick } = MEASURES[measure];
  return (
    <div className="flex flex-col gap-0.5">
      <Sparkline
        label={label}
        accentClassName={accentClassName}
        points={months.map((flow) => ({
          label: formatMonthLabel(flow.month),
          value: pick(flow),
          display: formatMoney(pick(flow), currency),
        }))}
      />
      <p className="truncate text-right text-[11px] leading-none text-muted">
        {formatMonthShort(first.month)}–{formatMonthShort(last.month)} · {currency}
      </p>
    </div>
  );
}
