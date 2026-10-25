"use server";

import {
  categoryNameProblem,
  isUuid,
  normalizeCategoryName,
  validateBudgetInput,
  validateBudgetLimit,
  type BudgetInputResult,
  type BudgetLimitInput,
  type ValidBudgetLimit,
} from "@money-manager/shared";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { findOrCreateCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export interface BudgetFormState {
  saved?: boolean;
  error?: string;
}

export type BudgetFormAction = (
  previous: BudgetFormState,
  formData: FormData,
) => Promise<BudgetFormState>;

// What Postgres reports when a budget clashes with another on its category:
// unique_violation from the one-ongoing-budget index, exclusion_violation
// from the no-overlapping-ranges constraint.
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";

/** The database stores a month as its first day. */
function toMonthDate(month: string | null): string | null {
  return month ? `${month}-01` : null;
}

function toRow(limit: ValidBudgetLimit) {
  return {
    amount_cents: limit.amountCents,
    currency: limit.currency,
    period: limit.period,
    start_month: toMonthDate(limit.startMonth),
    end_month: toMonthDate(limit.endMonth),
  };
}

/** A readable message for a clash the database refused, or null for any other error. */
function clashMessage(code: string | undefined): string | null {
  if (code === UNIQUE_VIOLATION) {
    return "This category already has an ongoing budget. Edit that one, or set this one for specific months.";
  }
  if (code === EXCLUSION_VIOLATION) {
    return "This category already has a budget for some of those months.";
  }
  return null;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readLimit(formData: FormData): BudgetLimitInput {
  return {
    amount: readString(formData, "amount"),
    currency: readString(formData, "currency"),
    period: readString(formData, "period"),
    startMonth: readString(formData, "startMonth"),
    endMonth: readString(formData, "endMonth"),
  };
}

function validateForm(formData: FormData): BudgetInputResult {
  return validateBudgetInput({ categoryId: readString(formData, "categoryId"), ...readLimit(formData) });
}

/**
 * The category arrives as a typed name: an existing expense category is used,
 * and a new name becomes one. Everything else is checked first, so a rejected
 * form never creates a category.
 */
export async function createBudget(
  _previous: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const categoryName = normalizeCategoryName(readString(formData, "categoryName"));
  if (!categoryName) return { error: "Choose or type a category." };
  const nameProblem = categoryNameProblem(categoryName);
  if (nameProblem) return { error: nameProblem };

  const result = validateBudgetLimit(readLimit(formData));
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  let categoryId: string;
  try {
    categoryId = await findOrCreateCategory("expense", categoryName);
  } catch (error) {
    console.error("Resolving budget category failed", error);
    return { error: "The category couldn't be saved. Try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").insert({
    user_id: userId,
    category_id: categoryId,
    ...toRow(result.limit),
  });
  const clash = clashMessage(error?.code);
  if (clash) return { error: clash };
  if (error) {
    console.error("Creating budget failed", error);
    return { error: "The budget couldn't be saved. Try again." };
  }

  refresh();
  return { saved: true };
}

/**
 * Bound to a budget id by the page: `updateBudget.bind(null, budget.id)`. Only
 * the limit, currency, and period change; moving a budget to another category is a
 * delete and a new budget.
 */
export async function updateBudget(
  budgetId: string,
  _previous: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  // The bound id came from the client, so it is checked like any other input.
  if (!isUuid(budgetId)) return { error: "This budget no longer exists." };
  const result = validateForm(formData);
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .update(toRow(result.budget))
    .eq("id", budgetId)
    .eq("user_id", userId)
    .select("id");
  const clash = clashMessage(error?.code);
  if (clash) return { error: clash };
  if (error) {
    console.error("Updating budget failed", error);
    return { error: "The changes couldn't be saved. Try again." };
  }
  // RLS turns someone else's id into zero rows rather than an error.
  if (data.length === 0) return { error: "This budget no longer exists." };

  refresh();
  return { saved: true };
}

export async function deleteBudget(budgetId: string): Promise<BudgetFormState> {
  if (!isUuid(budgetId)) return { error: "This budget no longer exists." };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", budgetId).eq("user_id", userId);
  if (error) {
    console.error("Deleting budget failed", error);
    return { error: "The budget couldn't be deleted. Try again." };
  }

  refresh();
  return { saved: true };
}
