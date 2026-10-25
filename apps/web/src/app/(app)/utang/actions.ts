"use server";

import {
  isUuid,
  validateUtangInput,
  validateUtangPaymentInput,
  type UtangInputResult,
  type ValidUtang,
} from "@money-manager/shared";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOutstanding } from "@/lib/utang";

export interface UtangFormState {
  saved?: boolean;
  error?: string;
}

export type UtangFormAction = (
  previous: UtangFormState,
  formData: FormData,
) => Promise<UtangFormState>;

// Postgres's check_violation, raised by the triggers that keep payments within
// the utang's amount (see the utang migration).
const CHECK_VIOLATION = "23514";

const GONE = "This utang no longer exists.";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateForm(formData: FormData): UtangInputResult {
  return validateUtangInput({
    direction: readString(formData, "direction"),
    person: readString(formData, "person"),
    amount: readString(formData, "amount"),
    currency: readString(formData, "currency"),
    incurredOn: readString(formData, "incurredOn"),
    dueOn: readString(formData, "dueOn"),
    note: readString(formData, "note"),
    accountId: readString(formData, "accountId"),
  });
}

/**
 * The database's check_violation triggers explain themselves in their
 * message; these turn the likely ones into something a person can act on.
 */
function constraintMessage(message: string): string {
  if (message.includes("same currency")) return "Choose an account in the same currency as the utang.";
  if (message.includes("Release the money")) {
    return "Release the money set aside for this before changing its currency.";
  }
  if (message.includes("already been paid")) {
    return "The amount can't be less than what has already been paid back.";
  }
  return "That's more than what's still owed. Refresh to see the latest payments.";
}

function toRow(utang: ValidUtang) {
  return {
    direction: utang.direction,
    person: utang.person,
    amount_cents: utang.amountCents,
    currency: utang.currency,
    incurred_on: utang.incurredOn,
    due_on: utang.dueOn,
    note: utang.note,
    account_id: utang.accountId,
  };
}

export async function createUtang(
  _previous: UtangFormState,
  formData: FormData,
): Promise<UtangFormState> {
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("utang").insert({ ...toRow(result.utang), user_id: userId });
  if (error?.code === CHECK_VIOLATION) return { error: constraintMessage(error.message) };
  if (error) {
    console.error("Creating utang failed", error);
    return { error: "The utang couldn't be saved. Try again." };
  }

  refresh();
  return { saved: true };
}

/** Bound to an utang id by the page: `updateUtang.bind(null, utang.id)`. */
export async function updateUtang(
  utangId: string,
  _previous: UtangFormState,
  formData: FormData,
): Promise<UtangFormState> {
  // The bound id came from the client, so it is checked like any other input.
  if (!isUuid(utangId)) return { error: GONE };
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("utang")
    .update(toRow(result.utang))
    .eq("id", utangId)
    .eq("user_id", userId)
    .select("id");
  if (error?.code === CHECK_VIOLATION) return { error: constraintMessage(error.message) };
  if (error) {
    console.error("Updating utang failed", error);
    return { error: "The changes couldn't be saved. Try again." };
  }
  // RLS turns someone else's id into zero rows rather than an error.
  if (data.length === 0) return { error: GONE };

  refresh();
  return { saved: true };
}

/** Deletes the utang and, by cascade, its payments. */
export async function deleteUtang(utangId: string): Promise<UtangFormState> {
  if (!isUuid(utangId)) return { error: GONE };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("utang").delete().eq("id", utangId).eq("user_id", userId);
  if (error) {
    console.error("Deleting utang failed", error);
    return { error: "The utang couldn't be deleted. Try again." };
  }

  refresh();
  return { saved: true };
}

/** Bound to an utang id by the page: `addUtangPayment.bind(null, utang.id)`. */
export async function addUtangPayment(
  utangId: string,
  _previous: UtangFormState,
  formData: FormData,
): Promise<UtangFormState> {
  if (!isUuid(utangId)) return { error: GONE };

  const { id: userId } = await getCurrentUser();
  const outstanding = await getOutstanding(utangId);
  if (!outstanding) return { error: GONE };

  const result = validateUtangPaymentInput(
    {
      amount: readString(formData, "amount"),
      paidOn: readString(formData, "paidOn"),
      note: readString(formData, "note"),
      accountId: readString(formData, "accountId"),
    },
    outstanding,
  );
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase.from("utang_payments").insert({
    user_id: userId,
    utang_id: utangId,
    amount_cents: result.payment.amountCents,
    paid_on: result.payment.paidOn,
    note: result.payment.note,
    account_id: result.payment.accountId,
  });
  // Another device can record a payment between the check above and this
  // insert; the database trigger is what catches that.
  if (error?.code === CHECK_VIOLATION) return { error: constraintMessage(error.message) };
  if (error) {
    console.error("Recording utang payment failed", error);
    return { error: "The payment couldn't be saved. Try again." };
  }

  refresh();
  return { saved: true };
}

export async function deleteUtangPayment(paymentId: string): Promise<UtangFormState> {
  if (!isUuid(paymentId)) return { error: "This payment no longer exists." };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("utang_payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", userId);
  if (error) {
    console.error("Deleting utang payment failed", error);
    return { error: "The payment couldn't be removed. Try again." };
  }

  refresh();
  return { saved: true };
}
