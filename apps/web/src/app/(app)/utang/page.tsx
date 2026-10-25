import {
  blankUtangInput,
  formatMoney,
  paginate,
  UTANG_DIRECTION_LABELS,
  utangTotalsByCurrency,
  type UtangDirection,
  type Page,
  type UtangTotals,
} from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, cardLinkClassName } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HandCoinsIcon,
  PlusIcon,
  ScaleIcon,
} from "@/components/icons";
import { MONEY_STYLE } from "@/components/money-style";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { buttonClassName, iconButtonClassName } from "@/components/ui/button";
import type { MoneyAccountOption } from "@/lib/accounts";
import { listCurrencyOptions } from "@/lib/currencies";
import { settledNewestFirst, type UtangWithPayments } from "@/lib/utang";
import {
  readPage,
  UTANG_LIST_VIEWS,
  UTANG_PARAMS,
  utangHref,
  type UtangListView,
} from "@/lib/utang-params";
import { createUtang } from "./actions";
import { loadUtang } from "./load-utang";
import { AddUtangDialog } from "./utang-dialogs";
import { UtangRow } from "./utang-row";

export const metadata: Metadata = { title: "Utang" };

const COLUMN_PAGE_SIZE = 5;

// From xl up the page fills the window instead of scrolling: the columns take
// whatever height is left and share it between their five row slots. Below
// that, each list keeps a fixed 27rem so the column still never resizes.
const COLUMN_CARD_CLASS = "xl:flex xl:min-h-0 xl:flex-col";
const ROW_SLOTS_CLASS =
  "-mx-3 grid h-[27rem] grid-rows-5 divide-y divide-border xl:h-auto xl:min-h-0 xl:flex-1";
const EMPTY_SLOTS_CLASS =
  "flex h-[27rem] items-center justify-center text-center text-sm text-muted xl:h-auto xl:flex-1";

const EMPTY_COLUMN: Record<UtangDirection, string> = {
  owed_to_me: "Nobody owes you anything right now.",
  i_owe: "You don't owe anyone right now.",
};

const COLUMN_VIEW: Record<UtangDirection, UtangListView> = {
  owed_to_me: "owed-to-you",
  i_owe: "you-owe",
};

const pagerLinkClassName = `${iconButtonClassName} border border-border`;
const pagerDisabledClassName = `${pagerLinkClassName} pointer-events-none opacity-40`;

/** "1–5 of 7" with previous and next arrows; always shown, so the card never changes height. */
function ColumnPager({
  page,
  hrefFor,
}: {
  page: Page<unknown>;
  hrefFor: (page: number) => string;
}) {
  const range =
    page.total === 0 ? "0" : `${page.firstIndex + 1}–${page.firstIndex + page.items.length}`;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted tabular-nums">
        {range} of {page.total}
      </p>
      <div className="flex items-center gap-1.5">
        {page.page > 1 ? (
          <Link
            href={hrefFor(page.page - 1)}
            scroll={false}
            aria-label="Previous page"
            className={pagerLinkClassName}
          >
            <ChevronLeftIcon width={16} height={16} />
          </Link>
        ) : (
          <span aria-hidden="true" className={pagerDisabledClassName}>
            <ChevronLeftIcon width={16} height={16} />
          </span>
        )}
        {page.page < page.pageCount ? (
          <Link
            href={hrefFor(page.page + 1)}
            scroll={false}
            aria-label="Next page"
            className={pagerLinkClassName}
          >
            <ChevronRightIcon width={16} height={16} />
          </Link>
        ) : (
          <span aria-hidden="true" className={pagerDisabledClassName}>
            <ChevronRightIcon width={16} height={16} />
          </span>
        )}
      </div>
    </nav>
  );
}

function DirectionColumn({
  direction,
  items,
  pageNumber,
  hrefForPage,
  today,
  knownPeople,
  accounts,
}: {
  direction: UtangDirection;
  items: UtangWithPayments[];
  pageNumber: number;
  hrefForPage: (page: number) => string;
  today: string;
  knownPeople: string[];
  accounts: MoneyAccountOption[];
}) {
  const page = paginate(items, pageNumber, COLUMN_PAGE_SIZE);
  const overdueCount = items.filter((item) => item.balance.isOverdue).length;
  const description = [
    `${items.length} open`,
    overdueCount > 0 ? `${overdueCount} overdue` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card
      title={UTANG_DIRECTION_LABELS[direction].heading}
      description={description}
      className={COLUMN_CARD_CLASS}
      action={
        items.length > 0 && (
          <Link href={UTANG_LIST_VIEWS[COLUMN_VIEW[direction]].path} className={cardLinkClassName}>
            View all <ArrowRightIcon width={14} height={14} />
          </Link>
        )
      }
    >
      {/* Five equal row slots whatever the page holds, so paging and adding
          or settling an utang never makes the column grow or shrink. */}
      {page.total === 0 ? (
        <p className={EMPTY_SLOTS_CLASS}>{EMPTY_COLUMN[direction]}</p>
      ) : (
        <ul className={ROW_SLOTS_CLASS}>
          {page.items.map((item) => (
            <UtangRow
              key={item.id}
              utang={item}
              today={today}
              knownPeople={knownPeople}
              accounts={accounts}
            />
          ))}
        </ul>
      )}
      <div className="mt-3 border-t border-border pt-3">
        <ColumnPager page={page} hrefFor={hrefForPage} />
      </div>
    </Card>
  );
}

function Summary({ totals }: { totals: UtangTotals[] }) {
  const values = (pick: (total: UtangTotals) => number) =>
    totals.map((total) => formatMoney(pick(total), total.currency));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Owed to you"
        {...MONEY_STYLE.owedToYou}
        values={values((t) => t.owedToMeCents)}
      />
      <StatCard label="You owe" {...MONEY_STYLE.youOwe} values={values((t) => t.iOweCents)} />
      <StatCard label="Net" tone="sky" icon={ScaleIcon} values={values((t) => t.netCents)} />
    </div>
  );
}

/**
 * Settled utang as one bar that goes straight to their own page, so nothing on
 * this page expands and pushes the columns around.
 */
function SettledLink({ count }: { count: number }) {
  return (
    <Link
      href={UTANG_LIST_VIEWS.settled.path}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4 shadow-card transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary sm:px-6"
    >
      <span className="text-sm font-semibold">Settled</span>
      <span className="flex items-center gap-2 text-sm text-muted group-hover:text-foreground">
        {count} paid in full
        <ArrowRightIcon width={16} height={16} />
      </span>
    </Link>
  );
}

async function UtangView({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { defaultCurrency, today, utang, knownPeople, accounts } = await loadUtang();

  if (utang.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={HandCoinsIcon}
          tone="peach"
          title="No utang yet"
          description="Keep track of money friends and family owe you, and money you owe them. It stays separate from your accounts."
          action={
            <AddUtangDialog
              initial={blankUtangInput(defaultCurrency, today)}
              action={createUtang}
              currencyOptions={listCurrencyOptions()}
              knownPeople={knownPeople}
              accounts={accounts}
            />
          }
        />
      </Card>
    );
  }

  const open = utang.filter((item) => !item.balance.isSettled);
  const settled = settledNewestFirst(utang);
  const openIn = (direction: UtangDirection) => open.filter((item) => item.direction === direction);
  const pages = {
    owedToYou: readPage(searchParams, UTANG_PARAMS.owedToYouPage),
    youOwe: readPage(searchParams, UTANG_PARAMS.youOwePage),
  };
  // Each column pages on its own, keeping the other column where it was.
  const columnPaging: Record<UtangDirection, { page: number; hrefFor: (page: number) => string }> = {
    owed_to_me: {
      page: pages.owedToYou,
      hrefFor: (page) => utangHref({ ...pages, owedToYou: page }),
    },
    i_owe: { page: pages.youOwe, hrefFor: (page) => utangHref({ ...pages, youOwe: page }) },
  };
  const totals = utangTotalsByCurrency(
    open.map((item) => ({ ...item, remainingCents: item.balance.remainingCents })),
  );

  return (
    <div className="flex flex-col gap-6 xl:min-h-0 xl:flex-1">
      <Summary totals={totals} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:min-h-0 xl:flex-1">
        {(["owed_to_me", "i_owe"] as const).map((direction) => (
          <DirectionColumn
            key={direction}
            direction={direction}
            items={openIn(direction)}
            pageNumber={columnPaging[direction].page}
            hrefForPage={columnPaging[direction].hrefFor}
            today={today}
            knownPeople={knownPeople}
            accounts={accounts}
          />
        ))}
      </div>
      {settled.length > 0 && <SettledLink count={settled.length} />}
    </div>
  );
}

const addUtangLabel = (
  <>
    <PlusIcon width={18} height={18} />
    Add utang
  </>
);

async function AddUtangAction() {
  const { defaultCurrency, today, utang, knownPeople, accounts } = await loadUtang();
  // The empty state carries its own button.
  if (utang.length === 0) return null;
  return (
    <AddUtangDialog
      initial={blankUtangInput(defaultCurrency, today)}
      action={createUtang}
      currencyOptions={listCurrencyOptions()}
      knownPeople={knownPeople}
      accounts={accounts}
    />
  );
}

function UtangSkeleton() {
  return (
    <div className="flex flex-col gap-6 xl:min-h-0 xl:flex-1" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:flex-1">
        {[0, 1].map((key) => (
          <div
            key={key}
            className="h-[36rem] animate-pulse rounded-2xl border border-border bg-surface xl:h-auto"
          />
        ))}
      </div>
    </div>
  );
}

export default function UtangPage({ searchParams }: PageProps<"/utang">) {
  return (
    // Exactly the window's height from xl up, less the main area's own top and
    // bottom padding (lg:pt-10 + lg:pb-12 in the app layout). The floor keeps
    // five rows readable on short windows, which scroll instead.
    <div className="flex flex-col xl:h-[calc(100dvh-5.5rem)] xl:min-h-[46rem]">
      <PageHeader
        title="Utang"
        description="Money you've lent and borrowed, kept apart from your accounts."
        actions={
          <Suspense
            fallback={
              <button type="button" disabled className={buttonClassName("primary")}>
                {addUtangLabel}
              </button>
            }
          >
            <AddUtangAction />
          </Suspense>
        }
      />
      {/* searchParams is request-time data under Cache Components, so it is
          awaited inside the boundary rather than by the page. */}
      <Suspense fallback={<UtangSkeleton />}>
        {searchParams.then((params) => (
          <UtangView searchParams={params} />
        ))}
      </Suspense>
    </div>
  );
}
