"use server";

import { availableCents, isUuid, validateSetAside } from "@money-manager/shared";
import { refresh } from "next/cache";
import { getAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface SetAsideFormState {
  saved?: boolean;
  error?: string;
}

/** What the money is set aside for: a wishlist item, or an utang the user owes. */
export type SetAsidePurpose = { wishlistItemId: string } | { utangId: string };

// Postgres's check_violation, raised by the set_asides triggers when the
// account can't cover it (see the money_links migration).
const CHECK_VIOLATION = "23514";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** The purpose's currency, or null when it doesn't exist or isn't the user's. */
async function purposeCurrency(purpose: SetAsidePurpose): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } =
    "wishlistItemId" in purpose
      ? await supabase.from("wishlist_items").select("currency").eq("id", purpose.wishlistItemId).maybeSingle()
      : await supabase.from("utang").select("currency").eq("id", purpose.utangId).maybeSingle();
  if (error) throw error;
  return data?.currency ?? null;
}

/** Bound to its purpose by the page: `setAsideMoney.bind(null, { wishlistItemId })`. */
export async function setAsideMoney(
  purpose: SetAsidePurpose,
  _previous: SetAsideFormState,
  formData: FormData,
): Promise<SetAsideFormState> {
  // The bound purpose came from the client, so it is checked like any other input.
  const purposeId = "wishlistItemId" in purpose ? purpose.wishlistItemId : purpose.utangId;
  if (!isUuid(purposeId)) return { error: "This no longer exists." };

  const accountId = readString(formData, "accountId");
  const [currency, account] = await Promise.all([
    purposeCurrency(purpose),
    isUuid(accountId.trim().toLowerCase()) ? getAccount(accountId.trim().toLowerCase()) : null,
  ]);
  if (!currency) return { error: "This no longer exists." };
  if (account && account.currency !== currency) {
    return { error: `Choose an account in ${currency}.` };
  }

  const result = validateSetAside(
    { accountId, amount: readString(formData, "amount") },
    account ? { availableCents: availableCents(account), currency: account.currency } : null,
  );
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("set_asides").insert({
    user_id: userId,
    account_id: result.setAside.accountId,
    amount_cents: result.setAside.amountCents,
    wishlist_item_id: "wishlistItemId" in purpose ? purpose.wishlistItemId : null,
    utang_id: "utangId" in purpose ? purpose.utangId : null,
  });
  // The triggers re-check the balance, which can change between the check
  // above and this insert.
  if (error?.code === CHECK_VIOLATION) {
    return { error: "That account doesn't have that much free any more. Refresh and try again." };
  }
  if (error) {
    console.error("Setting money aside failed", error);
    return { error: "The money couldn't be set aside. Try again." };
  }

  refresh();
  return { saved: true };
}

/** Frees money set aside, so it's available to spend again. */
export async function releaseSetAside(setAsideId: string): Promise<SetAsideFormState> {
  if (!isUuid(setAsideId)) return { error: "This was already released." };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("set_asides").delete().eq("id", setAsideId).eq("user_id", userId);
  if (error) {
    console.error("Releasing set-aside failed", error);
    return { error: "The money couldn't be released. Try again." };
  }

  refresh();
  return { saved: true };
}
