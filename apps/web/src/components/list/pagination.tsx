import type { Page } from "@money-manager/shared";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

interface PaginationProps {
  page: Page<unknown>;
  /** The URL of another page, carrying the list's search and filters along. */
  hrefFor: (page: number) => string;
}

/** "Showing 51–100 of 230" with previous and next links. */
export function Pagination({ page, hrefFor }: PaginationProps) {
  const linkClassName = buttonClassName("secondary");
  const disabledClassName = buttonClassName("secondary", "pointer-events-none opacity-50");
  return (
    <nav aria-label="Pages" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted">
        Showing {page.firstIndex + 1}–{page.firstIndex + page.items.length} of {page.total}
      </p>
      <div className="flex items-center gap-2">
        {page.page > 1 ? (
          <Link href={hrefFor(page.page - 1)} scroll={false} className={linkClassName}>
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClassName}>
            Previous
          </span>
        )}
        <span className="px-2 text-sm text-muted">
          Page {page.page} of {page.pageCount}
        </span>
        {page.page < page.pageCount ? (
          <Link href={hrefFor(page.page + 1)} scroll={false} className={linkClassName}>
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClassName}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
