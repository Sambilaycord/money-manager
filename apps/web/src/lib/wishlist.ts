import "server-only";
import {
  compareWishlistItems,
  isWishlistPriority,
  type ValidWishlistItem,
} from "@money-manager/shared";
import { createClient } from "@/lib/supabase/server";

export interface SetAsideEntry {
  id: string;
  accountId: string;
  accountName: string;
  amountCents: number;
}

export interface WishlistItem extends ValidWishlistItem {
  id: string;
  /** YYYY-MM-DD; null while still wanted. */
  boughtOn: string | null;
  /** Money set aside for the item, account by account. */
  setAsides: SetAsideEntry[];
  /** The sum of `setAsides`: what's saved toward the item. */
  savedCents: number;
}

/**
 * The signed-in user's wishlist: still-wanted items most wanted first, then
 * bought ones most recent first. RLS limits rows to the owner.
 */
export async function listWishlist(): Promise<WishlistItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      `id, name, url, price_cents, currency, priority, note, want_by, bought_on,
       set_asides(id, account_id, amount_cents, account:accounts(name))`,
    );

  if (error) throw error;

  const items = data.flatMap((row): WishlistItem[] => {
    // The column is a CHECK-constrained text, so the generated type is plain
    // string; anything outside the shared list means the two have drifted.
    if (!isWishlistPriority(row.priority)) {
      console.error(`Wishlist item ${row.id} has unknown priority "${row.priority}"; skipping it`);
      return [];
    }
    const setAsides = row.set_asides.map((setAside) => ({
      id: setAside.id,
      accountId: setAside.account_id,
      accountName: setAside.account?.name ?? "Unknown account",
      amountCents: setAside.amount_cents,
    }));
    return [
      {
        id: row.id,
        name: row.name,
        url: row.url,
        priceCents: row.price_cents,
        currency: row.currency,
        priority: row.priority,
        note: row.note,
        wantBy: row.want_by,
        boughtOn: row.bought_on,
        setAsides,
        savedCents: setAsides.reduce((sum, setAside) => sum + setAside.amountCents, 0),
      },
    ];
  });

  const wanted = items.filter((item) => item.boughtOn === null).sort(compareWishlistItems);
  const bought = items
    .filter((item) => item.boughtOn !== null)
    .sort((a, b) => (b.boughtOn ?? "").localeCompare(a.boughtOn ?? ""));
  return [...wanted, ...bought];
}
