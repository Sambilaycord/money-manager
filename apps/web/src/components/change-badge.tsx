import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@/components/icons";

interface ChangeBadgeProps {
  /** Relative change, e.g. 0.12 for +12%; null when there is nothing to compare with. */
  change: number | null;
  /** Whether a rise is good news (income, savings) or bad news (spending). */
  riseIs: "good" | "bad";
  /** What it's compared with, e.g. "previous 6 months". */
  comparedWith: string;
}

/**
 * "↑ 12% vs previous 6 months". Direction is carried by the arrow and the
 * word-like sign, never by colour alone; colour only adds whether it's good.
 */
export function ChangeBadge({ change, riseIs, comparedWith }: ChangeBadgeProps) {
  if (change === null) {
    return <p className="truncate text-xs text-muted">No earlier data to compare</p>;
  }
  const rounded = Math.round(change * 100);
  if (rounded === 0) {
    return <p className="truncate text-xs text-muted">No change vs {comparedWith}</p>;
  }
  const isRise = rounded > 0;
  const isGood = isRise === (riseIs === "good");
  const Arrow = isRise ? ArrowUpRightIcon : ArrowDownLeftIcon;
  return (
    <p className="flex min-w-0 items-center gap-1 text-xs">
      <span className={`flex shrink-0 items-center gap-0.5 font-medium ${isGood ? "text-income" : "text-expense"}`}>
        <Arrow width={12} height={12} aria-hidden="true" />
        {isRise ? "+" : "−"}
        {Math.abs(rounded)}%
      </span>
      <span className="truncate text-muted">vs {comparedWith}</span>
    </p>
  );
}
