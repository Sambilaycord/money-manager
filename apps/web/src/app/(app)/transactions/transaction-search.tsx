"use client";

import { normalizeSearch, SEARCH_MAX_LENGTH } from "@money-manager/shared";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { TRANSACTION_PARAMS } from "@/lib/transaction-params";
import { useListNavigation } from "./use-list-navigation";

const DEBOUNCE_MS = 300;

export function TransactionSearch({ search }: { search: string }) {
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
        if (normalized) params.set(TRANSACTION_PARAMS.search, normalized);
        else params.delete(TRANSACTION_PARAMS.search);
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
        placeholder="Search notes, categories, accounts, amounts"
        aria-label="Search transactions"
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
