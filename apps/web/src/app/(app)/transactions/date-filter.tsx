"use client";

import { Popover, PopoverPanel } from "@headlessui/react";
import { formatDayShort, isCalendarDate, monthOf, monthRange, shiftDate } from "@money-manager/shared";
import { startTransition, useId, useOptimistic } from "react";
import { CheckIcon } from "@/components/icons";
import { TRANSACTION_PARAMS } from "@/lib/transaction-params";
import { FilterButton } from "@/components/list/filter-button";
import { useListNavigation } from "@/components/list/use-list-navigation";

interface DateRange {
  from: string | null;
  to: string | null;
}

interface Preset {
  label: string;
  range: DateRange;
}

const WHOLE_MONTH: DateRange = { from: null, to: null };

/** Quick picks for the month on screen; "Today" and "Last 7 days" only while it is this month. */
function presetsFor(month: string, today: string): Preset[] {
  const { start, end } = monthRange(month);
  const presets: Preset[] = [{ label: "Whole month", range: WHOLE_MONTH }];
  if (monthOf(today) === month) {
    const weekAgo = shiftDate(today, -6);
    presets.push(
      { label: "Today", range: { from: today, to: today } },
      // Clipped to the month: the list only ever holds this month's days.
      { label: "Last 7 days", range: { from: weekAgo < start ? start : weekAgo, to: today } },
    );
  }
  presets.push(
    { label: "1st – 15th", range: { from: start, to: `${month}-15` } },
    { label: "16th – end of month", range: { from: `${month}-16`, to: end } },
  );
  return presets;
}

function summary(range: DateRange, month: string): string {
  if (!range.from && !range.to) return "Whole month";
  const { start, end } = monthRange(month);
  const from = range.from ?? start;
  const to = range.to ?? end;
  return from === to ? formatDayShort(from) : `${formatDayShort(from)} – ${formatDayShort(to)}`;
}

function isSameRange(a: DateRange, b: DateRange): boolean {
  return a.from === b.from && a.to === b.to;
}

interface DateFilterProps {
  /** YYYY-MM; the range narrows this month and never leaves it. */
  month: string;
  /** YYYY-MM-DD in the home time zone, for the "Today" and "Last 7 days" picks. */
  today: string;
  from: string | null;
  to: string | null;
}

/** Narrows the list to some days of the month, through quick picks or exact dates. */
export function DateFilter({ month, today, from, to }: DateFilterProps) {
  const navigate = useListNavigation();
  // The choice shows immediately and settles to the URL's state once the page
  // has re-rendered with it.
  const [range, setRange] = useOptimistic<DateRange>({ from, to });
  const idPrefix = useId();
  const { start, end } = monthRange(month);

  const apply = (next: DateRange) => {
    startTransition(() => {
      setRange(next);
      navigate((params) => {
        params.delete(TRANSACTION_PARAMS.dateFrom);
        params.delete(TRANSACTION_PARAMS.dateTo);
        if (next.from) params.set(TRANSACTION_PARAMS.dateFrom, next.from);
        if (next.to) params.set(TRANSACTION_PARAMS.dateTo, next.to);
      });
    });
  };

  // min and max only guide the picker; a typed date can still fall outside
  // the month, and the page ignores those, so it is pulled back inside.
  const clampToMonth = (value: string) => (value < start ? start : value > end ? end : value);

  // Date inputs report "" while a typed date is incomplete; only finished or
  // cleared values are applied. Moving one end past the other drags it along.
  const changeFrom = (value: string) => {
    if (value && !isCalendarDate(value)) return;
    const nextFrom = value ? clampToMonth(value) : null;
    apply({ from: nextFrom, to: nextFrom && range.to && range.to < nextFrom ? nextFrom : range.to });
  };
  const changeTo = (value: string) => {
    if (value && !isCalendarDate(value)) return;
    const nextTo = value ? clampToMonth(value) : null;
    apply({ from: nextTo && range.from && range.from > nextTo ? nextTo : range.from, to: nextTo });
  };

  const isFiltering = !isSameRange(range, WHOLE_MONTH);

  return (
    <Popover className="relative">
      <FilterButton label="Date" summary={summary(range, month)} isFiltering={isFiltering} />
      <PopoverPanel
        anchor="bottom start"
        className="z-40 flex w-64 flex-col rounded-2xl border border-border bg-surface text-foreground shadow-overlay [--anchor-gap:6px]"
      >
        <ul className="p-1.5">
          {presetsFor(month, today).map((preset) => {
            const isActive = isSameRange(range, preset.range);
            return (
              <li key={preset.label}>
                <button
                  type="button"
                  onClick={() => apply(preset.range)}
                  aria-pressed={isActive}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-sunken ${
                    isActive ? "font-medium text-primary" : ""
                  }`}
                >
                  {preset.label}
                  {isActive && <CheckIcon width={16} height={16} />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
          <label htmlFor={`${idPrefix}-from`} className="flex flex-col gap-1 text-xs font-medium text-muted">
            From
            <input
              id={`${idPrefix}-from`}
              type="date"
              value={range.from ?? ""}
              min={start}
              max={end}
              onChange={(event) => changeFrom(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <label htmlFor={`${idPrefix}-to`} className="flex flex-col gap-1 text-xs font-medium text-muted">
            To
            <input
              id={`${idPrefix}-to`}
              type="date"
              value={range.to ?? ""}
              min={start}
              max={end}
              onChange={(event) => changeTo(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
