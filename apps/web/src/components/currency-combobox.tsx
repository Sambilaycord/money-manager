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
import { useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import type { CurrencyOption } from "@/lib/currencies";

function matchesQuery(option: CurrencyOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return (
    option.code.toLowerCase().includes(needle) ||
    option.name.toLowerCase().includes(needle) ||
    option.symbol === query.trim()
  );
}

interface CurrencyComboboxProps {
  name: string;
  label: string;
  options: CurrencyOption[];
  defaultCode: string;
}

export function CurrencyCombobox({ name, label, options, defaultCode }: CurrencyComboboxProps) {
  // The value is the bare code, not the option object: Headless UI submits an
  // object as one hidden input per property (currency[code], currency[name]…).
  const [code, setCode] = useState<string | null>(defaultCode);
  // Empty until the person types, so opening the list shows every currency
  // rather than only the ones matching the current selection.
  const [query, setQuery] = useState("");
  const visibleOptions = query ? options.filter((option) => matchesQuery(option, query)) : options;

  return (
    <Field className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Combobox
        name={name}
        value={code}
        onChange={setCode}
        onClose={() => setQuery("")}
        immediate
      >
        <div className="relative">
          <ComboboxInput
            displayValue={(selected: string | null) => selected ?? ""}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={(event) => event.target.select()}
            autoComplete="off"
            className="h-10 w-full rounded-xl border border-border bg-surface pr-9 pl-3.5 font-mono text-sm uppercase outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          <ComboboxButton
            aria-label="Show all currencies"
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted hover:text-foreground"
          >
            <ChevronDownIcon width={16} height={16} />
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          className="z-50 max-h-64 w-72 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-overlay [--anchor-gap:4px]"
        >
          {visibleOptions.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted">No currency matches “{query}”</p>
          )}
          {visibleOptions.map((option) => (
            <ComboboxOption
              key={option.code}
              value={option.code}
              className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm select-none data-focus:bg-primary-soft"
            >
              <span className="w-7 shrink-0 text-center text-muted">{option.symbol ?? ""}</span>
              <span className="w-10 shrink-0 font-mono font-medium">{option.code}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{option.name}</span>
              <CheckIcon
                width={16}
                height={16}
                className="invisible shrink-0 text-primary group-data-selected:visible"
              />
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>
    </Field>
  );
}
