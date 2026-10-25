import { formatMonthLabel, shiftMonth } from "@money-manager/shared";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { iconButtonClassName } from "@/components/ui/button";

interface MonthNavProps {
  /** YYYY-MM on screen. */
  month: string;
  /** The page's URL for another month, keeping whatever else the page carries. */
  hrefForMonth: (month: string) => string;
}

/** Previous and next links around the month's name. */
export function MonthNav({ month, hrefForMonth }: MonthNavProps) {
  return (
    <nav aria-label="Month" className="flex shrink-0 items-center justify-center gap-1">
      <Link
        href={hrefForMonth(shiftMonth(month, -1))}
        aria-label="Previous month"
        className={iconButtonClassName}
      >
        <ChevronLeftIcon width={18} height={18} />
      </Link>
      <h2 className="min-w-36 text-center text-sm font-semibold">{formatMonthLabel(month)}</h2>
      <Link
        href={hrefForMonth(shiftMonth(month, 1))}
        aria-label="Next month"
        className={iconButtonClassName}
      >
        <ChevronRightIcon width={18} height={18} />
      </Link>
    </nav>
  );
}
