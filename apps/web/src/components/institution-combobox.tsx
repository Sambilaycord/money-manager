"use client";

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Description,
  Field,
  Label,
} from "@headlessui/react";
import { INSTITUTION_MAX_LENGTH, PH_BRANDS, matchBrand } from "@money-manager/shared";
import { useState } from "react";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "@/components/icons";
import { CharacterCount } from "@/components/ui/character-count";

const optionClassName =
  "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm select-none data-focus:bg-primary-soft";

interface InstitutionComboboxProps {
  name: string;
  label: string;
  value: string | null;
  onChange: (institution: string | null) => void;
}

/**
 * Known PH banks and e-wallets to pick from, or any other name typed in: the
 * list is a shortcut, so an unlisted bank must never block the form.
 */
export function InstitutionCombobox({ name, label, value, onChange }: InstitutionComboboxProps) {
  const [query, setQuery] = useState("");
  const typed = query.trim();
  const visibleBrands = typed ? PH_BRANDS.filter((brand) => matchesQuery(brand, typed)) : PH_BRANDS;
  const isExactBrand = PH_BRANDS.some((brand) => brand.name.toLowerCase() === typed.toLowerCase());
  // While typing, the input shows the query; otherwise it shows the chosen value.
  const visibleLength = (query || value || "").length;

  return (
    <Field className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">
        {label} <span className="font-normal text-muted">(optional)</span>
      </Label>
      <Combobox name={name} value={value} onChange={onChange} onClose={() => setQuery("")} immediate>
        <div className="relative">
          <ComboboxInput
            displayValue={(selected: string | null) => selected ?? ""}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. GoTyme, GCash, BPI"
            maxLength={INSTITUTION_MAX_LENGTH}
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
              aria-label="Show banks and e-wallets"
              className="flex items-center py-2 pr-2.5 pl-1 text-muted hover:text-foreground"
            >
              <ChevronDownIcon width={16} height={16} />
            </ComboboxButton>
          </div>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          className="z-50 max-h-64 w-(--input-width) overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-overlay [--anchor-gap:4px]"
        >
          {visibleBrands.map((brand) => (
            <ComboboxOption key={brand.id} value={brand.name} className={optionClassName}>
              <span
                aria-hidden="true"
                // Each dot shows the brand's own colour; this is data, not theme.
                style={{ backgroundColor: brand.colors[0]?.hex }}
                className="size-3 shrink-0 rounded-full"
              />
              <span className="min-w-0 flex-1 truncate">{brand.name}</span>
              <CheckIcon
                width={16}
                height={16}
                className="invisible shrink-0 text-primary group-data-selected:visible"
              />
            </ComboboxOption>
          ))}
          {/* Last, so Enter on "gotyme" picks the GoTyme brand rather than the raw text. */}
          {typed && !isExactBrand && (
            <ComboboxOption value={typed} className={optionClassName}>
              <span className="min-w-0 flex-1 truncate">
                Use “<span className="font-medium">{typed}</span>”
              </span>
            </ComboboxOption>
          )}
        </ComboboxOptions>
      </Combobox>
      <Description as="div">
        <CharacterCount length={visibleLength} limit={INSTITUTION_MAX_LENGTH} />
      </Description>
    </Field>
  );
}

function matchesQuery(brand: (typeof PH_BRANDS)[number], query: string): boolean {
  const needle = query.toLowerCase();
  return (
    brand.name.toLowerCase().includes(needle) ||
    brand.aliases.some((alias) => alias.includes(needle)) ||
    matchBrand(query)?.id === brand.id
  );
}
