import "server-only";
import { isBudgetPeriod, monthOf, type ValidBudget } from "@money-manager/shared";
import { createClient } from "@/lib/supabase/server";

export interface BudgetWithCategory extends ValidBudget {
  id: string;
  categoryName: string;
}

/** The signed-in user's budgets, by category name. RLS limits rows to the owner. */
export async function listBudgets(): Promise<BudgetWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select(
      "id, category_id, amount_cents, currency, period, start_month, end_month, category:categories(name)",
    );

  if (error) throw error;

  return data
    .flatMap((row) => {
      if (!row.category) {
        console.error(`Budget ${row.id} has no readable category; skipping it`);
        return [];
      }
      // The column is a CHECK-constrained text, so the generated type is plain
      // string; anything outside the shared list means the two have drifted.
      if (!isBudgetPeriod(row.period)) {
        console.error(`Budget ${row.id} has unknown period "${row.period}"; skipping it`);
        return [];
      }
      return [
        {
          id: row.id,
          categoryId: row.category_id,
          categoryName: row.category.name,
          amountCents: row.amount_cents,
          currency: row.currency,
          period: row.period,
          // Stored as the month's first day; the apps work in YYYY-MM.
          startMonth: row.start_month ? monthOf(row.start_month) : null,
          endMonth: row.end_month ? monthOf(row.end_month) : null,
        },
      ];
    })
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}
