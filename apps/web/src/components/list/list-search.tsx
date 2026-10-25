"use client";

import { normalizeSearch, SEARCH_MAX_LENGTH } from "@money-manager/shared";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { LIST_SEARCH_PARAM } from "./list-params";
import { useListNavigation } from "./use-list-navigation";

const DEBOUNCE_MS = 300;

interface ListSearchProps {
  /** The search currently in the URL. */
  search: string;
  /** Visible hint of what can be searched, e.g. "Search notes, accounts, amounts". */
  placeholder: string;
  /** Accessible name, e.g. "Search transactions". */
  label: string;
}

/** A search box that writes to the URL as you type, after a short pause. */
export function ListSearch({ search, placeholder, label }: ListSearchProps) {
  const navigate = useListNavigation();
  const [text, setText] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The URL can change without this box: "Clear filters" empties it. Typing
  // also changes it, a moment later, and that echo must not overwrite letters
  // typed since, hence the comparison with what this box last sent.
  if (search !== lastSearch) {
    setLastSearch(search);
    if (search !== normalizeSearch(text)) setText(search);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (value: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate((params) => {
        const normalized = normalizeSearch(value);
        if (normalized) params.set(LIST_SEARCH_PARAM, normalized);
        else params.delete(LIST_SEARCH_PARAM);
      });
    }, DEBOUNCE_MS);
  };

  const change = (value: string) => {
    setText(value);
    send(value);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={text}
        onChange={(event) => change(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        maxLength={SEARCH_MAX_LENGTH}
        className="h-10 w-full rounded-xl border border-border bg-surface pr-9 pl-9 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => change("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-surface-sunken hover:text-foreground"
        >
          <CloseIcon width={14} height={14} />
        </button>
      )}
    </div>
  );
}
