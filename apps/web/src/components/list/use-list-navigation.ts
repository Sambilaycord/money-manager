"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { LIST_PAGE_PARAM } from "./list-params";

/**
 * Rewrites the page's URL in place. Reads the live URL rather than a
 * render-time snapshot, so a debounced search and a quick checkbox click
 * don't overwrite each other's changes.
 */
export function useListNavigation(): (update: (params: URLSearchParams) => void) => void {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (update) => {
      const params = new URLSearchParams(window.location.search);
      update(params);
      // Changing what's in the list makes the old page number meaningless.
      params.delete(LIST_PAGE_PARAM);
      router.replace(`${pathname}?${params}`, { scroll: false });
    },
    [router, pathname],
  );
}
