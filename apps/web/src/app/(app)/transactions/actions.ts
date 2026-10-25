"use server";

import {
  categoryNameProblem,
  isUuid,
  normalizeCategoryName,
  validateTransactionInput,
  type TransactionInputResult,
  type ValidTransaction,
} from "@money-manager/shared";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateCategory } from "@/lib/categories";
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
    // The category arrives as a typed name and is resolved to an id only once
    // everything else has passed, so a rejected form never creates one.
    categoryId: "",
    occurredOn: readString(formData, "occurredOn"),
    note: readString(formData, "note"),
  });
}

type Prepared = { ok: true; transaction: ValidTransaction } | { ok: false; error: string };

/**
 * Validates the form, checks its accounts, and turns the typed category name
 * into a category id, creating the category the first time a name is used.
 */
async function prepareTransaction(formData: FormData): Promise<Prepared> {
  const result = validateForm(formData);
  if (!result.ok) return result;
  const categoryName = normalizeCategoryName(readString(formData, "categoryName"));
  const nameProblem = categoryNameProblem(categoryName);
  if (nameProblem) return { ok: false, error: nameProblem };

  const problem = await findReferenceProblem(result.transaction);
  if (problem) return { ok: false, error: problem };

  const { transaction } = result;
  if (transaction.type === "transfer" || !categoryName) return { ok: true, transaction };
  try {
    const categoryId = await findOrCreateCategory(transaction.type, categoryName);
    return { ok: true, transaction: { ...transaction, categoryId } };
  } catch (error) {
    console.error("Resolving category failed", error);
    return { ok: false, error: "The category couldn't be saved. Try again." };
  }
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
  const { id: userId } = await getCurrentUser();
  const result = await prepareTransaction(formData);
  if (!result.ok) return { error: result.error };

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

  const { id: userId } = await getCurrentUser();
  const result = await prepareTransaction(formData);
  if (!result.ok) return { error: result.error };

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
