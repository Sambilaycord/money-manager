"use client";

import { Popover, PopoverPanel } from "@headlessui/react";
import { startTransition, useId, useOptimistic } from "react";
import { FilterButton } from "./filter-button";
import { useListNavigation } from "./use-list-navigation";

export interface ChecklistOption {
  value: string;
  label: string;
}

export interface ChecklistGroup {
  /** Omitted for a single, unheaded group. */
  label?: string;
  options: ChecklistOption[];
}

interface ChecklistFilterProps {
  label: string;
  /** The URL parameter that lists the unticked values. */
  param: string;
  groups: ChecklistGroup[];
  hidden: readonly string[];
}

function summary(shownCount: number, totalCount: number): string {
  if (shownCount === totalCount) return "All";
  if (shownCount === 0) return "None";
  return `${shownCount} of ${totalCount}`;
}

/**
 * A dropdown of checkboxes, all ticked by default; unticking one hides it from
 * the list. Every change applies at once, with no separate apply step.
 */
export function ChecklistFilter({ label, param, groups, hidden }: ChecklistFilterProps) {
  const navigate = useListNavigation();
  // Ticks show immediately and settle to the URL's state once the page has
  // re-rendered with it.
  const [shownHidden, setShownHidden] = useOptimistic(hidden);
  const idPrefix = useId();

  const allValues = groups.flatMap((group) => group.options.map((option) => option.value));
  const shownCount = allValues.filter((value) => !shownHidden.includes(value)).length;
  const isFiltering = shownCount < allValues.length;

  const apply = (nextHidden: string[]) => {
    startTransition(() => {
      setShownHidden(nextHidden);
      navigate((params) => {
        params.delete(param);
        for (const value of nextHidden) params.append(param, value);
      });
    });
  };

  const toggle = (value: string, isTicked: boolean) =>
    apply(
      isTicked ? shownHidden.filter((hiddenValue) => hiddenValue !== value) : [...shownHidden, value],
    );

  return (
    <Popover className="relative">
      <FilterButton
        label={label}
        summary={summary(shownCount, allValues.length)}
        isFiltering={isFiltering}
      />
      <PopoverPanel
        anchor="bottom start"
        className="z-40 flex max-h-80 w-64 flex-col rounded-2xl border border-border bg-surface text-foreground shadow-overlay [--anchor-gap:6px]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs">
          <button
            type="button"
            onClick={() => apply([])}
            className="font-medium text-primary hover:underline"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => apply(allValues)}
            className="text-muted hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
        <div className="overflow-y-auto p-1.5">
          {groups.map((group, groupIndex) => (
            <fieldset key={group.label ?? groupIndex} className="not-first:mt-1.5">
              {group.label ? (
                <legend className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted">{group.label}</legend>
              ) : (
                <legend className="sr-only">{label}</legend>
              )}
              {group.options.map((option) => {
                const id = `${idPrefix}-${option.value}`;
                const isTicked = !shownHidden.includes(option.value);
                return (
                  <label
                    key={option.value}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-surface-sunken"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={isTicked}
                      onChange={(event) => toggle(option.value, event.target.checked)}
                      className="size-4 accent-primary"
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  );
}
