"use server";

import {
  isUuid,
  validateWishlistInput,
  validateWishlistPurchase,
  type ValidWishlistItem,
  type WishlistInputResult,
} from "@money-manager/shared";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface WishlistFormState {
  saved?: boolean;
  error?: string;
}

export type WishlistFormAction = (
  previous: WishlistFormState,
  formData: FormData,
) => Promise<WishlistFormState>;

const GONE = "This item no longer exists.";

// Postgres's check_violation, raised by the money triggers and functions (see
// the money_links migrations).
const CHECK_VIOLATION = "23514";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateForm(formData: FormData): WishlistInputResult {
  return validateWishlistInput({
    name: readString(formData, "name"),
    url: readString(formData, "url"),
    price: readString(formData, "price"),
    currency: readString(formData, "currency"),
    priority: readString(formData, "priority"),
    wantBy: readString(formData, "wantBy"),
    note: readString(formData, "note"),
  });
}

function toRow(item: ValidWishlistItem) {
  return {
    name: item.name,
    url: item.url,
    price_cents: item.priceCents,
    currency: item.currency,
    priority: item.priority,
    want_by: item.wantBy,
    note: item.note,
  };
}

export async function createWishlistItem(
  _previous: WishlistFormState,
  formData: FormData,
): Promise<WishlistFormState> {
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("wishlist_items")
    .insert({ ...toRow(result.item), user_id: userId });
  if (error) {
    console.error("Creating wishlist item failed", error);
    return { error: "The item couldn't be saved. Try again." };
  }

  refresh();
  return { saved: true };
}

/** Bound to an item id by the page: `updateWishlistItem.bind(null, item.id)`. */
export async function updateWishlistItem(
  itemId: string,
  _previous: WishlistFormState,
  formData: FormData,
): Promise<WishlistFormState> {
  // The bound id came from the client, so it is checked like any other input.
  if (!isUuid(itemId)) return { error: GONE };
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .update(toRow(result.item))
    .eq("id", itemId)
    .eq("user_id", userId)
    .select("id");
  if (error?.code === CHECK_VIOLATION) {
    return { error: "Release the money set aside for this item before changing its currency." };
  }
  if (error) {
    console.error("Updating wishlist item failed", error);
    return { error: "The changes couldn't be saved. Try again." };
  }
  // RLS turns someone else's id into zero rows rather than an error.
  if (data.length === 0) return { error: GONE };

  refresh();
  return { saved: true };
}

/**
 * Records buying the item: an expense from the chosen account, and the money
 * set aside for it released. Bound to an item id by the page.
 */
export async function buyWishlistItem(
  itemId: string,
  _previous: WishlistFormState,
  formData: FormData,
): Promise<WishlistFormState> {
  if (!isUuid(itemId)) return { error: GONE };
  const result = validateWishlistPurchase({
    accountId: readString(formData, "accountId"),
    amount: readString(formData, "amount"),
    boughtOn: readString(formData, "boughtOn"),
    categoryId: readString(formData, "categoryId"),
  });
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  // One database call, so the expense, the bought mark, and the released
  // money all happen together or not at all.
  const { error } = await supabase.rpc("buy_wishlist_item", {
    item_id: itemId,
    from_account_id: result.purchase.accountId,
    paid_cents: result.purchase.amountCents,
    bought_on: result.purchase.boughtOn,
    category_id: result.purchase.categoryId ?? undefined,
  });
  if (error?.code === CHECK_VIOLATION) {
    return { error: "Choose an account in the item's currency and an expense category." };
  }
  if (error) {
    console.error("Buying wishlist item failed", error);
    return { error: "The purchase couldn't be recorded. Try again." };
  }

  refresh();
  return { saved: true };
}

/** Puts a bought item back on the wishlist and removes the purchase it recorded. */
export async function unbuyWishlistItem(itemId: string): Promise<WishlistFormState> {
  if (!isUuid(itemId)) return { error: GONE };

  const supabase = await createClient();
  const { error } = await supabase.rpc("unbuy_wishlist_item", { item_id: itemId });
  if (error) {
    console.error("Un-buying wishlist item failed", error);
    return { error: "The item couldn't be moved back. Try again." };
  }

  refresh();
  return { saved: true };
}

/** Deletes the item; money set aside for it is released by cascade. */
export async function deleteWishlistItem(itemId: string): Promise<WishlistFormState> {
  if (!isUuid(itemId)) return { error: GONE };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) {
    console.error("Deleting wishlist item failed", error);
    return { error: "The item couldn't be deleted. Try again." };
  }

  refresh();
  return { saved: true };
}
