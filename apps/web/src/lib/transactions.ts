import "server-only";
import {
  isCategoryType,
  isTransactionType,
  monthRange,
  type Category,
  type TransactionListItem,
  type ValidTransaction,
} from "@money-manager/shared";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase's default cap on rows per request. One person's month, or even
 * half a year, sits far below it; if a query ever reaches it, the page says
 * the list is incomplete.
 */
export const TRANSACTION_ROW_LIMIT = 1000;

/**
 * Every transaction in a month, newest first. RLS limits rows to the signed-in
 * user's. Search and filters are applied afterwards, in shared code: a month is
 * small, and search has to match category and account names, which a single
 * PostgREST filter can't OR across joined tables.
 */
export async function listMonthTransactions(month: string): Promise<TransactionListItem[]> {
  const { start, end } = monthRange(month);
  return listTransactionsBetween(start, end);
}

/** Every transaction dated from `start` to `end` inclusive (YYYY-MM-DD), newest first. */
export async function listTransactionsBetween(
  start: string,
  end: string,
): Promise<TransactionListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `id, type, amount_cents, note, occurred_on, account_id, transfer_account_id, category_id,
       category:categories(name),
       source:accounts!transactions_account_id_user_id_fkey(name, currency),
       destination:accounts!transactions_transfer_account_id_user_id_fkey(name)`,
    )
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(TRANSACTION_ROW_LIMIT);

  if (error) throw error;

  return data.flatMap((row) => {
    if (!isTransactionType(row.type) || !row.source) {
      console.error(`Transaction ${row.id} has unknown type or account; skipping it`);
      return [];
    }
    return [
      {
        id: row.id,
        type: row.type,
        amountCents: row.amount_cents,
        accountId: row.account_id,
        transferAccountId: row.transfer_account_id,
        categoryId: row.category_id,
        occurredOn: row.occurred_on,
        note: row.note,
        currency: row.source.currency,
        accountName: row.source.name,
        transferAccountName: row.destination?.name ?? null,
        categoryName: row.category?.name ?? null,
      },
    ];
  });
}

/** The signed-in user's categories that are still in use, by name. */
export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, type, is_archived")
    .eq("is_archived", false)
    .order("name");

  if (error) throw error;

  return data.flatMap((row) => {
    if (!isCategoryType(row.type)) {
      console.error(`Category ${row.id} has unknown type "${row.type}"; skipping it`);
      return [];
    }
    return [{ id: row.id, name: row.name, type: row.type, isArchived: row.is_archived }];
  });
}

/**
 * Why the transaction's accounts or category can't be used, or null when they
 * can. The database enforces all of this too; checking first turns its errors
 * into messages a person can act on.
 */
export async function findReferenceProblem(transaction: ValidTransaction): Promise<string | null> {
  const supabase = await createClient();
  const accountIds = [transaction.accountId, transaction.transferAccountId].filter(
    (id): id is string => id !== null,
  );

  const [accountsResult, categoryResult] = await Promise.all([
    supabase.from("accounts").select("id, currency").in("id", accountIds),
    transaction.categoryId
      ? supabase.from("categories").select("type").eq("id", transaction.categoryId).maybeSingle()
      : Promise.resolve(null),
  ]);

  if (accountsResult.error) throw accountsResult.error;
  if (categoryResult?.error) throw categoryResult.error;

  const currencyOf = (id: string) => accountsResult.data.find((row) => row.id === id)?.currency;
  const sourceCurrency = currencyOf(transaction.accountId);
  if (!sourceCurrency) return "That account no longer exists.";

  if (transaction.transferAccountId) {
    const destinationCurrency = currencyOf(transaction.transferAccountId);
    if (!destinationCurrency) return "The account you're transferring to no longer exists.";
    // Amounts are stored once, in one currency, so a cross-currency transfer
    // would create or destroy money.
    if (destinationCurrency !== sourceCurrency) {
      return "Transfers have to be between accounts in the same currency.";
    }
  }

  if (categoryResult) {
    if (!categoryResult.data) return "That category no longer exists.";
    if (categoryResult.data.type !== transaction.type) {
      return `That category is for ${categoryResult.data.type === "income" ? "income" : "expenses"}.`;
    }
  }

  return null;
}
