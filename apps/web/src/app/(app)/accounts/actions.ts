"use server";

import { validateAccountInput, type AccountInputResult } from "@money-manager/shared";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { accountHasTransactions, getAccount } from "@/lib/accounts";
import { LOGIN_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export interface AccountFormState {
  saved?: boolean;
  error?: string;
}

export type AccountFormAction = (
  previous: AccountFormState,
  formData: FormData,
) => Promise<AccountFormState>;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateForm(formData: FormData): AccountInputResult {
  return validateAccountInput({
    name: readString(formData, "name"),
    institution: readString(formData, "institution"),
    type: readString(formData, "type"),
    currency: readString(formData, "currency"),
    balance: readString(formData, "balance"),
    color: readString(formData, "color"),
  });
}

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect(LOGIN_PATH);
  return data.user.id;
}

export async function createAccount(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const userId = await requireUserId();
  const { account } = result;
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert({
    user_id: userId,
    name: account.name,
    institution: account.institution,
    type: account.type,
    currency: account.currency,
    opening_balance_cents: account.openingBalanceCents,
    color: account.color,
  });
  if (error) {
    console.error("Creating account failed", error);
    return { error: "The account couldn't be saved. Try again." };
  }

  refresh();
  return { saved: true };
}

/** Bound to an account id by the page: `updateAccount.bind(null, account.id)`. */
export async function updateAccount(
  accountId: string,
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const userId = await requireUserId();
  // The bound id came from the client, so it is re-checked here: getAccount
  // validates it and, through RLS, finds only the signed-in user's accounts.
  const existing = await getAccount(accountId);
  if (!existing) return { error: "This account no longer exists." };

  const { account } = result;
  // Transaction amounts are stored in the account's currency, so relabelling
  // the currency afterwards would silently misstate every one of them.
  if (account.currency !== existing.currency && (await accountHasTransactions(accountId))) {
    return {
      error: `This account already has transactions in ${existing.currency}, so its currency can't change.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({
      name: account.name,
      institution: account.institution,
      type: account.type,
      currency: account.currency,
      opening_balance_cents: account.openingBalanceCents,
      color: account.color,
    })
    .eq("id", accountId)
    .eq("user_id", userId);
  if (error) {
    console.error("Updating account failed", error);
    return { error: "The changes couldn't be saved. Try again." };
  }

  refresh();
  return { saved: true };
}
