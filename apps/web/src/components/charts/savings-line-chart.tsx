"use client";

import { formatMoney, formatMoneyCompact } from "@money-manager/shared";
import { useState, type KeyboardEvent, type PointerEvent } from "react";

export interface SavingsPoint {
  /** e.g. "October 2026", for the tooltip and table. */
  label: string;
  /** e.g. "Oct", for the x-axis. */
  shortLabel: string;
  /** Running total saved by the end of this month. */
  cumulativeCents: number;
  /** Saved (or overspent) in this month alone. */
  monthCents: number;
}

// The drawing's own units; the SVG stretches to its box, and everything that
// must stay round or readable (dots, labels, tooltip) is HTML on top.
const HEIGHT = 100;

/** Rounds up to 1, 2, 2.5 or 5 times a power of ten so axis labels are round numbers. */
function niceCeiling(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= value) ?? 10;
  return step * magnitude;
}

interface SavingsLineChartProps {
  /** Oldest first, at least two. */
  points: readonly SavingsPoint[];
  currency: string;
}

/**
 * Cumulative savings across the period: one series, so one colour and no
 * legend box; the card title names it. Zero is always in range, so dipping
 * below the line reads as having spent more than earned so far.
 */
export function SavingsLineChart({ points, currency }: SavingsLineChartProps) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length < 2) return null;

  const values = points.map((point) => point.cumulativeCents);
  const top = niceCeiling(Math.max(0, ...values));
  const bottom = -niceCeiling(Math.max(0, ...values.map((value) => -value)));
  const span = top - bottom || 1;
  const xOf = (index: number) => (index / (points.length - 1)) * 100;
  const yOf = (value: number) => ((top - value) / span) * HEIGHT;
  const zeroY = yOf(0);

  const line = points.map((point, index) => `${xOf(index)},${yOf(point.cumulativeCents)}`).join(" ");
  const area = `0,${zeroY} ${line} 100,${zeroY}`;
  const ticks = [...new Set([top, (top + bottom) / 2, bottom])];
  const last = points.length - 1;
  const lastPoint = points[last];
  const activePoint = active === null ? undefined : points[active];

  const nearestIndex = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    return Math.round(fraction * last);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const from = active ?? last;
    setActive(Math.min(Math.max(from + (event.key === "ArrowRight" ? 1 : -1), 0), last));
  };

  return (
    <div>
      <div className="flex gap-3">
        <div aria-hidden="true" className="relative h-52 w-12 shrink-0 text-right text-[11px] text-muted tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} style={{ top: `${(yOf(tick) / HEIGHT) * 100}%` }} className="absolute right-0 -translate-y-1/2">
              {tick === 0 ? "0" : formatMoneyCompact(tick, currency)}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`Cumulative savings, ending at ${lastPoint ? formatMoney(lastPoint.cumulativeCents, currency) : ""}. Use the left and right arrow keys to read each month.`}
          tabIndex={0}
          onPointerMove={(event) => setActive(nearestIndex(event))}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(last)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
          className="relative h-52 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={100}
                y1={yOf(tick)}
                y2={yOf(tick)}
                className={tick === 0 ? "stroke-border" : "stroke-border/60"}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <polygon points={area} className="fill-chart-net/10" />
            <polyline
              points={line}
              fill="none"
              className="stroke-chart-net"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {activePoint && active !== null && (
              <line
                x1={xOf(active)}
                x2={xOf(active)}
                y1={0}
                y2={HEIGHT}
                className="stroke-muted/50"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* The end dot and its direct label: the one value the chart is about. */}
          {lastPoint && (
            <>
              <span
                aria-hidden="true"
                className="absolute size-2.5 -translate-1/2 rounded-full bg-chart-net ring-2 ring-surface"
                style={{ left: "100%", top: `${(yOf(lastPoint.cumulativeCents) / HEIGHT) * 100}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute right-0 -translate-y-[160%] text-xs font-semibold whitespace-nowrap"
                style={{ top: `${(yOf(lastPoint.cumulativeCents) / HEIGHT) * 100}%` }}
              >
                {formatMoney(lastPoint.cumulativeCents, currency)}
              </span>
            </>
          )}

          {activePoint && active !== null && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-chart-net ring-2 ring-surface"
                style={{ left: `${xOf(active)}%`, top: `${(yOf(activePoint.cumulativeCents) / HEIGHT) * 100}%` }}
              />
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute top-0 z-10 w-48 rounded-xl border border-border bg-surface p-3 text-xs shadow-overlay ${
                  xOf(active) > 60 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3"
                }`}
                style={{ left: `${xOf(active)}%` }}
              >
                <p className="mb-1.5 font-semibold">{activePoint.label}</p>
                <p className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="h-0.5 w-3 rounded-full bg-chart-net" />
                    Saved so far
                  </span>
                  <span className="font-semibold tabular-nums">{formatMoney(activePoint.cumulativeCents, currency)}</span>
                </p>
                <p className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="text-muted">This month</span>
                  <span className="tabular-nums">
                    {activePoint.monthCents > 0 ? "+" : activePoint.monthCents < 0 ? "−" : ""}
                    {formatMoney(Math.abs(activePoint.monthCents), currency)}
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="mt-2 ml-15 flex justify-between text-xs text-muted">
        {points.map((point, index) => (
          <span key={point.label} className={index === active ? "font-medium text-foreground" : ""}>
            {point.shortLabel}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Savings by month, in {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Saved that month</th>
            <th scope="col">Saved so far</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{formatMoney(point.monthCents, currency)}</td>
              <td>{formatMoney(point.cumulativeCents, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
