"use client";

import { PopoverButton } from "@headlessui/react";
import { ChevronDownIcon } from "@/components/icons";

/**
 * The trigger every list filter shares, so they read as one row of controls.
 * Render it inside a Headless UI <Popover>.
 */
export function FilterButton({
  label,
  summary,
  isFiltering,
}: {
  label: string;
  /** What the filter currently lets through, e.g. "All" or "3 of 5". */
  summary: string;
  isFiltering: boolean;
}) {
  return (
    <PopoverButton
      className={`inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-surface px-3.5 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 sm:w-auto ${
        isFiltering ? "border-primary" : "border-border"
      }`}
    >
      <span className="truncate">
        {label}: <span className={isFiltering ? "font-medium text-primary" : "text-muted"}>{summary}</span>
      </span>
      <ChevronDownIcon width={16} height={16} className="text-muted" />
    </PopoverButton>
  );
}
