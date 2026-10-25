"use client";

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Field,
  Label,
} from "@headlessui/react";
import {
  CATEGORY_NAME_MAX_LENGTH,
  findCategoryByName,
  normalizeCategoryName,
} from "@money-manager/shared";
import { useState } from "react";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "@/components/icons";

const optionClassName =
  "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm select-none data-focus:bg-primary-soft";

export interface CategorySuggestion {
  id: string;
  name: string;
}

/** Names starting with what was typed come first, then names merely containing it. */
function suggestionsFor(
  categories: readonly CategorySuggestion[],
  typed: string,
): CategorySuggestion[] {
  const needle = typed.toLowerCase();
  if (!needle) return [...categories];
  const starts = categories.filter((category) => category.name.toLowerCase().startsWith(needle));
  const contains = categories.filter(
    (category) =>
      !category.name.toLowerCase().startsWith(needle) && category.name.toLowerCase().includes(needle),
  );
  return [...starts, ...contains];
}

interface CategoryComboboxProps {
  /** Submitted as a name; the server finds the category or creates it. */
  name: string;
  label: string;
  /** What to suggest; each form decides, e.g. only categories without a budget. */
  categories: readonly CategorySuggestion[];
  /** Says whether an empty field is allowed, as "(optional)" beside the label. */
  isOptional: boolean;
  value: string | null;
  onChange: (categoryName: string | null) => void;
}

/**
 * Type a category: existing ones are suggested as you go, and a new name
 * becomes a category of its own once the form is saved, so it is suggested
 * from then on.
 */
export function CategoryCombobox({
  name,
  label,
  categories,
  isOptional,
  value,
  onChange,
}: CategoryComboboxProps) {
  const [query, setQuery] = useState("");
  const typed = normalizeCategoryName(query);
  const suggestions = suggestionsFor(categories, typed);
  const isExisting = findCategoryByName(categories, typed) !== undefined;

  return (
    <Field className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">
        {label} {isOptional && <span className="font-normal text-muted">(optional)</span>}
      </Label>
      <Combobox name={name} value={value} onChange={onChange} onClose={() => setQuery("")} immediate>
        <div className="relative">
          <ComboboxInput
            displayValue={(selected: string | null) => selected ?? ""}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to search or add, e.g. Coffee"
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            autoComplete="off"
            className="h-10 w-full rounded-xl border border-border bg-surface pr-16 pl-3.5 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                aria-label={`Clear ${label.toLowerCase()}`}
                className="p-1.5 text-muted hover:text-foreground"
              >
                <CloseIcon width={14} height={14} />
              </button>
            )}
            <ComboboxButton
              aria-label="Show categories"
              className="flex items-center py-2 pr-2.5 pl-1 text-muted hover:text-foreground"
            >
              <ChevronDownIcon width={16} height={16} />
            </ComboboxButton>
          </div>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          className="z-50 max-h-64 w-(--input-width) overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-overlay empty:invisible [--anchor-gap:4px]"
        >
          {suggestions.map((category) => (
            <ComboboxOption key={category.id} value={category.name} className={optionClassName}>
              <span className="min-w-0 flex-1 truncate">{category.name}</span>
              <CheckIcon
                width={16}
                height={16}
                className="invisible shrink-0 text-primary group-data-selected:visible"
              />
            </ComboboxOption>
          ))}
          {/* Last, so Enter on "groc" picks the existing suggestion, not new text. */}
          {typed && !isExisting && (
            <ComboboxOption value={typed} className={optionClassName}>
              <span className="min-w-0 flex-1 truncate">
                Add “<span className="font-medium">{typed}</span>”
              </span>
            </ComboboxOption>
          )}
        </ComboboxOptions>
      </Combobox>
    </Field>
  );
}
