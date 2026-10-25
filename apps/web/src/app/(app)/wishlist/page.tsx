import {
  blankWishlistInput,
  formatDayWithYear,
  formatMoney,
  HOME_TIME_ZONE,
  todayIn,
  WISHLIST_PRIORITY_LABELS,
  wishlistProgress,
  wishlistToInput,
  wishlistTotalsByCurrency,
  type WishlistPriority,
  type WishlistTotals,
} from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { GiftIcon, PlusIcon, TrendIcon, WalletIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { toneClassName, type PastelTone } from "@/components/tone";
import { buttonClassName } from "@/components/ui/button";
import {
  getDefaultCurrency,
  listOpenAccounts,
  toMoneyAccountOption,
  type MoneyAccountOption,
} from "@/lib/accounts";
import { listCurrencyOptions } from "@/lib/currencies";
import { listCategories } from "@/lib/transactions";
import { listWishlist, type WishlistItem } from "@/lib/wishlist";
import { releaseSetAside, setAsideMoney } from "../set-aside-actions";
import {
  buyWishlistItem,
  createWishlistItem,
  deleteWishlistItem,
  unbuyWishlistItem,
  updateWishlistItem,
} from "./actions";
import {
  AddWishlistDialog,
  ShopLink,
  WishlistDetailDialog,
  type CategoryOption,
} from "./wishlist-dialogs";
import { WishlistMeter } from "./wishlist-meter";

export const metadata: Metadata = { title: "Wishlist" };

const WISHLIST_PATH = "/wishlist";
const BOUGHT_VIEW = "bought";

const PRIORITY_TONE: Record<WishlistPriority, PastelTone> = {
  high: "rose",
  medium: "butter",
  low: "cloud",
};

// cache() so the header button and the page body share one set of queries.
const loadWishlist = cache(async () => {
  const [items, defaultCurrency, accounts, categories] = await Promise.all([
    listWishlist(),
    getDefaultCurrency(),
    listOpenAccounts(),
    listCategories(),
  ]);
  return {
    items,
    defaultCurrency,
    accounts: accounts.map(toMoneyAccountOption),
    expenseCategories: categories
      .filter((category) => category.type === "expense")
      .map(({ id, name }) => ({ id, name })),
    // Read after the queries: under Cache Components, "today" has to come
    // after request-time data rather than during prerendering.
    today: todayIn(HOME_TIME_ZONE),
  };
});

/** What every card's dialog needs besides the item itself. */
interface CardSetup {
  today: string;
  accounts: MoneyAccountOption[];
  expenseCategories: CategoryOption[];
}

function WishlistCard({ item, setup }: { item: WishlistItem; setup: CardSetup }) {
  const progress = wishlistProgress(item);
  const isBought = item.boughtOn !== null;
  return (
    <li className="relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition-colors has-[>button:hover]:bg-surface-sunken/60">
      {/* The whole card opens the item; it sits under the content so the
          shop link above it stays separately clickable. */}
      <WishlistDetailDialog
        item={item}
        input={wishlistToInput(item)}
        today={setup.today}
        currencyOptions={listCurrencyOptions()}
        accounts={setup.accounts}
        expenseCategories={setup.expenseCategories}
        updateAction={updateWishlistItem.bind(null, item.id)}
        buyAction={buyWishlistItem.bind(null, item.id)}
        unbuyAction={unbuyWishlistItem.bind(null, item.id)}
        deleteAction={deleteWishlistItem.bind(null, item.id)}
        setAsideAction={setAsideMoney.bind(null, { wishlistItemId: item.id })}
        releaseAction={releaseSetAside}
        triggerLabel={`Open ${item.name}`}
        triggerClassName="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-primary"
      />
      <div className="pointer-events-none flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClassName[PRIORITY_TONE[item.priority]]}`}
        >
          {WISHLIST_PRIORITY_LABELS[item.priority]}
        </span>
        <span className="truncate text-xs text-muted">
          {isBought && item.boughtOn
            ? `Bought ${formatDayWithYear(item.boughtOn)}`
            : item.wantBy
              ? `By ${formatDayWithYear(item.wantBy)}`
              : null}
        </span>
      </div>
      <div className="pointer-events-none min-w-0">
        <h3 className="line-clamp-2 font-semibold text-balance">{item.name}</h3>
        {item.note && <p className="mt-1 truncate text-sm text-muted">{item.note}</p>}
      </div>
      {item.url && (
        <div className="relative w-fit max-w-full">
          <ShopLink url={item.url} />
        </div>
      )}
      <div className="pointer-events-none mt-auto">
        <p className="text-xl font-semibold tracking-tight tabular-nums">
          {item.priceCents === null ? (
            <span className="text-base font-medium text-muted">No price yet</span>
          ) : (
            formatMoney(item.priceCents, item.currency)
          )}
        </p>
        {!isBought && progress.ratio !== null && (
          <div className="mt-2">
            <WishlistMeter ratio={progress.ratio} />
            <p className="mt-1.5 text-xs text-muted tabular-nums">
              {progress.isFullySaved
                ? "Fully saved"
                : `${formatMoney(item.savedCents, item.currency)} set aside · ${formatMoney(progress.remainingCents ?? 0, item.currency)} to go`}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}

function Summary({ totals }: { totals: WishlistTotals[] }) {
  const values = (pick: (total: WishlistTotals) => number) =>
    totals.map((total) => formatMoney(pick(total), total.currency));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Wishlist total" tone="rose" icon={GiftIcon} values={values((t) => t.priceCents)} />
      <StatCard label="Set aside" tone="mint" icon={WalletIcon} values={values((t) => t.savedCents)} />
      <StatCard label="Still to save" tone="sky" icon={TrendIcon} values={values((t) => t.neededCents)} />
    </div>
  );
}

function ViewTabs({ isBought, wantedCount, boughtCount }: { isBought: boolean; wantedCount: number; boughtCount: number }) {
  const tabs = [
    { label: "Wanted", count: wantedCount, href: WISHLIST_PATH, isCurrent: !isBought },
    { label: "Bought", count: boughtCount, href: `${WISHLIST_PATH}?view=${BOUGHT_VIEW}`, isCurrent: isBought },
  ];
  return (
    <nav aria-label="Wishlist view" className="inline-grid grid-cols-2 gap-1 self-start rounded-xl bg-surface-sunken p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          scroll={false}
          aria-current={tab.isCurrent ? "page" : undefined}
          className={`rounded-lg px-4 py-1.5 text-center text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary ${
            tab.isCurrent ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {tab.label} <span className="text-muted tabular-nums">{tab.count}</span>
        </Link>
      ))}
    </nav>
  );
}

async function WishlistView({ view }: { view: string | undefined }) {
  const { items, defaultCurrency, today, accounts, expenseCategories } = await loadWishlist();
  const setup = { today, accounts, expenseCategories };

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={GiftIcon}
          tone="rose"
          title="Your wishlist is empty"
          description="Add things you want to buy or save up for. Paste a link to remember where to get them."
          action={
            <AddWishlistDialog
              initial={blankWishlistInput(defaultCurrency)}
              action={createWishlistItem}
              currencyOptions={listCurrencyOptions()}
            />
          }
        />
      </Card>
    );
  }

  const wanted = items.filter((item) => item.boughtOn === null);
  const bought = items.filter((item) => item.boughtOn !== null);
  const isBought = view === BOUGHT_VIEW;
  const shown = isBought ? bought : wanted;

  return (
    <div className="flex flex-col gap-6">
      <Summary totals={wishlistTotalsByCurrency(wanted)} />
      <ViewTabs isBought={isBought} wantedCount={wanted.length} boughtCount={bought.length} />
      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={GiftIcon}
            tone="rose"
            title={isBought ? "Nothing bought yet" : "Nothing left to want"}
            description={
              isBought
                ? "When you mark an item as bought, it moves here."
                : "Everything on your list is bought. Add something new to save up for."
            }
          />
        </Card>
      ) : (
        <ul className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${isBought ? "opacity-80" : ""}`}>
          {shown.map((item) => (
            <WishlistCard key={item.id} item={item} setup={setup} />
          ))}
        </ul>
      )}
    </div>
  );
}

const addItemLabel = (
  <>
    <PlusIcon width={18} height={18} />
    Add item
  </>
);

async function AddWishlistAction() {
  const { items, defaultCurrency } = await loadWishlist();
  // The empty state carries its own button.
  if (items.length === 0) return null;
  return (
    <AddWishlistDialog
      initial={blankWishlistInput(defaultCurrency)}
      action={createWishlistItem}
      currencyOptions={listCurrencyOptions()}
    />
  );
}

function WishlistSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-56 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}

export default function WishlistPage({ searchParams }: PageProps<"/wishlist">) {
  return (
    <>
      <PageHeader
        title="Wishlist"
        description="Things you want to buy or save up for."
        actions={
          <Suspense
            fallback={
              <button type="button" disabled className={buttonClassName("primary")}>
                {addItemLabel}
              </button>
            }
          >
            <AddWishlistAction />
          </Suspense>
        }
      />
      {/* searchParams is request-time data under Cache Components, so it is
          awaited inside the boundary rather than by the page. */}
      <Suspense fallback={<WishlistSkeleton />}>
        {searchParams.then((params) => (
          <WishlistView view={typeof params.view === "string" ? params.view : undefined} />
        ))}
      </Suspense>
    </>
  );
}
