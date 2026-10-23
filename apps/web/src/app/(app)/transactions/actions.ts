"use server";

import {
  isUuid,
  validateTransactionInput,
  type TransactionInputResult,
  type ValidTransaction,
} from "@money-manager/shared";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { findReferenceProblem } from "@/lib/transactions";

export interface TransactionFormState {
  saved?: boolean;
  error?: string;
}

export type TransactionFormAction = (
  previous: TransactionFormState,
  formData: FormData,
) => Promise<TransactionFormState>;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateForm(formData: FormData): TransactionInputResult {
  return validateTransactionInput({
    type: readString(formData, "type"),
    amount: readString(formData, "amount"),
    accountId: readString(formData, "accountId"),
    transferAccountId: readString(formData, "transferAccountId"),
    categoryId: readString(formData, "categoryId"),
    occurredOn: readString(formData, "occurredOn"),
    note: readString(formData, "note"),
  });
}

function toRow(transaction: ValidTransaction) {
  return {
    type: transaction.type,
    amount_cents: transaction.amountCents,
    account_id: transaction.accountId,
    transfer_account_id: transaction.transferAccountId,
    category_id: transaction.categoryId,
    occurred_on: transaction.occurredOn,
    note: transaction.note,
  };
}

export async function createTransaction(
  _previous: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const problem = await findReferenceProblem(result.transaction);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .insert({ ...toRow(result.transaction), user_id: userId });
  if (error) {
    console.error("Creating transaction failed", error);
    return { error: "The transaction couldn't be saved. Try again." };
  }

  refresh();
  return { saved: true };
}

/** Bound to a transaction id by the page: `updateTransaction.bind(null, transaction.id)`. */
export async function updateTransaction(
  transactionId: string,
  _previous: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  // The bound id came from the client, so it is checked like any other input.
  if (!isUuid(transactionId)) return { error: "This transaction no longer exists." };
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const problem = await findReferenceProblem(result.transaction);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update(toRow(result.transaction))
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select("id");
  if (error) {
    console.error("Updating transaction failed", error);
    return { error: "The changes couldn't be saved. Try again." };
  }
  // RLS turns someone else's id into zero rows rather than an error.
  if (data.length === 0) return { error: "This transaction no longer exists." };

  refresh();
  return { saved: true };
}

export async function deleteTransaction(transactionId: string): Promise<TransactionFormState> {
  if (!isUuid(transactionId)) return { error: "This transaction no longer exists." };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId);
  if (error) {
    console.error("Deleting transaction failed", error);
    return { error: "The transaction couldn't be deleted. Try again." };
  }

  refresh();
  return { saved: true };
}
