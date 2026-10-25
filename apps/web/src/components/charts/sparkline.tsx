export interface SparklinePoint {
  /** Shown in the hover tooltip and to screen readers, e.g. "October 2026". */
  label: string;
  value: number;
  /** The value as people read it, e.g. from `formatMoney`. */
  display: string;
}

interface SparklineProps {
  /** Oldest first; the last point is the period the card is about. */
  points: readonly SparklinePoint[];
  /** Fill class for the current-period dot, e.g. "bg-chart-income". */
  accentClassName: string;
  /** Names the series for screen readers, e.g. "Spent". */
  label: string;
}

// The drawing's own units. The SVG stretches to its box, so only the line
// lives in it; dots are HTML, which keeps them round at any width.
const HEIGHT = 40;
const PADDING = 5;

function toPercent(value: number, min: number, max: number): number {
  const span = max - min || 1;
  const y = HEIGHT - PADDING - ((value - min) / span) * (HEIGHT - 2 * PADDING);
  return (y / HEIGHT) * 100;
}

function tooltipPosition(index: number, count: number): string {
  if (index === 0) return "left-0";
  if (index === count - 1) return "right-0";
  return "left-1/2 -translate-x-1/2";
}

/**
 * A small trend line for a stat card: the history recedes in muted ink and the
 * current period is a dot in the card's colour. Hovering a month shows its
 * value; screen readers get the same figures as a list instead of the drawing.
 */
export function Sparkline({ points, accentClassName, label }: SparklineProps) {
  if (points.length < 2) return null;

  const values = points.map((point) => point.value);
  // Zero stays in range so a flat month reads as nothing, not as a low.
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const xOf = (index: number) => (index / (points.length - 1)) * 100;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: xOf(index),
    y: toPercent(point.value, min, max),
    // Each hover target spans halfway to its neighbours, far wider than the
    // point itself.
    hitStart: index === 0 ? 0 : (xOf(index - 1) + xOf(index)) / 2,
    hitEnd: index === points.length - 1 ? 100 : (xOf(index) + xOf(index + 1)) / 2,
  }));
  const current = coordinates[coordinates.length - 1];
  const showsZeroLine = min < 0 && max > 0;

  return (
    <div>
      <div aria-hidden="true" className="relative h-8 w-full">
        <svg
          viewBox={`0 0 100 ${HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {showsZeroLine && (
            <line
              x1={0}
              x2={100}
              y1={(toPercent(0, min, max) / 100) * HEIGHT}
              y2={(toPercent(0, min, max) / 100) * HEIGHT}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <polyline
            points={coordinates.map((point) => `${point.x},${(point.y / 100) * HEIGHT}`).join(" ")}
            fill="none"
            className="stroke-muted/60"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {current && (
          <span
            className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${accentClassName}`}
            style={{ left: `${current.x}%`, top: `${current.y}%` }}
          />
        )}
        {coordinates.map((point, index) => (
          <div
            key={point.label}
            className="group absolute inset-y-0"
            style={{ left: `${point.hitStart}%`, right: `${100 - point.hitEnd}%` }}
          >
            <span
              className="absolute hidden size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted ring-2 ring-surface group-hover:block"
              style={{
                left: `${((point.x - point.hitStart) / (point.hitEnd - point.hitStart)) * 100}%`,
                top: `${point.y}%`,
              }}
            />
            <span
              className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg border border-border bg-surface px-2 py-1 text-xs shadow-overlay group-hover:block ${tooltipPosition(index, points.length)}`}
            >
              <span className="text-muted">{point.label}</span>{" "}
              <span className="font-medium tabular-nums">{point.display}</span>
            </span>
          </div>
        ))}
      </div>
      <ul className="sr-only" aria-label={`${label}, month by month`}>
        {points.map((point) => (
          <li key={point.label}>
            {point.label}: {point.display}
          </li>
        ))}
      </ul>
    </div>
  );
}
