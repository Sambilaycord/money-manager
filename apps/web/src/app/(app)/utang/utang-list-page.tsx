import {
  filterUtang,
  hasActiveUtangFilters,
  NO_UTANG_FILTERS,
  paginate,
  UTANG_DIRECTIONS,
  UTANG_DIRECTION_LABELS,
  UTANG_DUE_STATES,
  UTANG_DUE_STATE_LABELS,
} from "@money-manager/shared";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { ChevronLeftIcon, HandCoinsIcon } from "@/components/icons";
import { ChecklistFilter } from "@/components/list/checklist-filter";
import { ListSearch } from "@/components/list/list-search";
import { Pagination } from "@/components/list/pagination";
import { PageHeader } from "@/components/page-header";
import { buttonClassName } from "@/components/ui/button";
import { settledNewestFirst, type UtangWithPayments } from "@/lib/utang";
import {
  parseUtangListParams,
  UTANG_LIST_VIEWS,
  UTANG_PARAMS,
  UTANG_PATH,
  utangListHref,
  type UtangListParams,
  type UtangListView,
} from "@/lib/utang-params";
import { loadUtang } from "./load-utang";
import { UtangRow } from "./utang-row";

const PAGE_SIZE = 20;

const EMPTY_LIST: Record<UtangListView, { title: string; description: string }> = {
  "owed-to-you": {
    title: "Nobody owes you right now",
    description: "Money you lend shows up here until it's paid back.",
  },
  "you-owe": {
    title: "You don't owe anyone right now",
    description: "Money you borrow shows up here until you've paid it back.",
  },
  settled: {
    title: "Nothing settled yet",
    description: "Once an utang is paid back in full, it moves here.",
  },
};

/** The view's own items before any search or filter, in the order the list shows them. */
function itemsFor(view: UtangListView, utang: UtangWithPayments[]): UtangWithPayments[] {
  const { direction } = UTANG_LIST_VIEWS[view];
  if (direction === null) return settledNewestFirst(utang);
  // Already sorted most urgent first by listUtang.
  return utang.filter((item) => !item.balance.isSettled && item.direction === direction);
}

function Toolbar({
  view,
  params,
  currencies,
}: {
  view: UtangListView;
  params: UtangListParams;
  /** Every currency in this list, so the filter only offers real choices. */
  currencies: string[];
}) {
  const { filters } = params;
  const isSettled = view === "settled";
  return (
    <div className="border-b border-border p-3 sm:p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <ListSearch
          search={filters.search}
          placeholder="Search names, notes, amounts"
          label={`Search ${UTANG_LIST_VIEWS[view].title.toLowerCase()}`}
        />
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:flex lg:shrink-0 lg:items-center">
          {/* Open lists are one direction already; settled ones mix both. */}
          {isSettled ? (
            <ChecklistFilter
              label="Direction"
              param={UTANG_PARAMS.hiddenDirection}
              hidden={filters.hiddenDirections}
              groups={[
                {
                  options: UTANG_DIRECTIONS.map((direction) => ({
                    value: direction,
                    label: UTANG_DIRECTION_LABELS[direction].heading,
                  })),
                },
              ]}
            />
          ) : (
            <ChecklistFilter
              label="Due"
              param={UTANG_PARAMS.hiddenDue}
              hidden={filters.hiddenDueStates}
              groups={[
                {
                  options: UTANG_DUE_STATES.map((state) => ({
                    value: state,
                    label: UTANG_DUE_STATE_LABELS[state],
                  })),
                },
              ]}
            />
          )}
          {/* A single currency leaves nothing to choose between. */}
          {currencies.length > 1 && (
            <ChecklistFilter
              label="Currency"
              param={UTANG_PARAMS.hiddenCurrency}
              hidden={filters.hiddenCurrencies}
              groups={[{ options: currencies.map((code) => ({ value: code, label: code })) }]}
            />
          )}
        </div>
        {hasActiveUtangFilters(filters) && (
          <Link
            href={utangListHref(view, { page: 1, filters: NO_UTANG_FILTERS })}
            className={buttonClassName("ghost", "shrink-0")}
          >
            Clear
          </Link>
        )}
      </div>
    </div>
  );
}

async function ListView({
  view,
  searchParams,
}: {
  view: UtangListView;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { today, utang, knownPeople, accounts } = await loadUtang();
  const items = itemsFor(view, utang);

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface shadow-card">
        <EmptyState icon={HandCoinsIcon} tone="peach" {...EMPTY_LIST[view]} />
      </section>
    );
  }

  const params = parseUtangListParams(searchParams);
  const currencies = [...new Set(items.map((item) => item.currency))].sort();
  const page = paginate(filterUtang(items, params.filters), params.page, PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-card">
      <Toolbar view={view} params={params} currencies={currencies} />
      {page.total === 0 ? (
        <EmptyState
          icon={HandCoinsIcon}
          tone="peach"
          title="No matches"
          description="Nothing here matches this search and these filters."
        />
      ) : (
        <div className="p-2 sm:p-3">
          <ul className="divide-y divide-border">
            {page.items.map((item) => (
              <UtangRow key={item.id} utang={item} today={today} knownPeople={knownPeople} accounts={accounts} />
            ))}
          </ul>
          <div className="mt-2 border-t border-border px-3 pt-4 pb-2">
            <Pagination
              page={page}
              hrefFor={(target) => utangListHref(view, { ...params, page: target })}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="h-96 animate-pulse rounded-2xl border border-border bg-surface" />
  );
}

/** A full, searchable list of one kind of utang; each route under /utang renders one view. */
export function UtangListPage({
  view,
  searchParams,
}: {
  view: UtangListView;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { title, description } = UTANG_LIST_VIEWS[view];
  return (
    <>
      <Link
        href={UTANG_PATH}
        className="-ml-2 mb-4 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ChevronLeftIcon width={16} height={16} /> Utang
      </Link>
      <PageHeader title={title} description={description} />
      {/* searchParams is request-time data under Cache Components, so it is
          awaited inside the boundary rather than by the page. */}
      <Suspense fallback={<ListSkeleton />}>
        {searchParams.then((params) => (
          <ListView view={view} searchParams={params} />
        ))}
      </Suspense>
    </>
  );
}
