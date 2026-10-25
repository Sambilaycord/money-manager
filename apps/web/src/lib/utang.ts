import "server-only";
import {
  isUtangDirection,
  settledOn,
  utangBalance,
  type UtangBalance,
  type ValidUtang,
} from "@money-manager/shared";
import { createClient } from "@/lib/supabase/server";
import type { SetAsideEntry } from "@/lib/wishlist";

export interface UtangPayment {
  id: string;
  amountCents: number;
  /** YYYY-MM-DD. */
  paidOn: string;
  note: string | null;
  /** The account the money arrived in or came from; null when untracked. */
  accountName: string | null;
}

export interface UtangWithPayments extends ValidUtang {
  id: string;
  /** The account the lent money left or the borrowed money arrived in. */
  accountName: string | null;
  /** Newest first. */
  payments: UtangPayment[];
  balance: UtangBalance;
  /** YYYY-MM-DD of the final payment; null while anything is still owed. */
  settledOn: string | null;
  /** Money set aside to pay this back; only ever on utang the user owes. */
  setAsides: SetAsideEntry[];
  setAsideCents: number;
}

/**
 * The signed-in user's utang with their payments, open ones soonest-due first
 * and then by person. RLS limits rows to the owner.
 */
export async function listUtang(today: string): Promise<UtangWithPayments[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("utang")
    .select(
      `id, direction, person, amount_cents, currency, note, incurred_on, due_on, account_id,
       account:accounts(name),
       payments:utang_payments(id, amount_cents, paid_on, note, account:accounts(name)),
       set_asides(id, account_id, amount_cents, account:accounts(name))`,
    )
    .order("incurred_on", { ascending: false });

  if (error) throw error;

  return data
    .flatMap((row) => {
      // The column is a CHECK-constrained text, so the generated type is plain
      // string; anything outside the shared list means the two have drifted.
      if (!isUtangDirection(row.direction)) {
        console.error(`Utang ${row.id} has unknown direction "${row.direction}"; skipping it`);
        return [];
      }
      const payments = row.payments
        .map((payment) => ({
          id: payment.id,
          amountCents: payment.amount_cents,
          paidOn: payment.paid_on,
          note: payment.note,
          accountName: payment.account?.name ?? null,
        }))
        .sort((a, b) => b.paidOn.localeCompare(a.paidOn));
      const utang: ValidUtang = {
        direction: row.direction,
        person: row.person,
        amountCents: row.amount_cents,
        currency: row.currency,
        incurredOn: row.incurred_on,
        dueOn: row.due_on,
        note: row.note,
        accountId: row.account_id,
      };
      const setAsides = row.set_asides.map((setAside) => ({
        id: setAside.id,
        accountId: setAside.account_id,
        accountName: setAside.account?.name ?? "Unknown account",
        amountCents: setAside.amount_cents,
      }));
      const balance = utangBalance(utang, payments, today);
      return [
        {
          ...utang,
          id: row.id,
          accountName: row.account?.name ?? null,
          payments,
          balance,
          settledOn: settledOn(balance, payments),
          setAsides,
          setAsideCents: setAsides.reduce((sum, setAside) => sum + setAside.amountCents, 0),
        },
      ];
    })
    .sort(byUrgency);
}

/** Overdue first, then by due date (undated last), then by name. */
function byUrgency(a: UtangWithPayments, b: UtangWithPayments): number {
  if (a.balance.isOverdue !== b.balance.isOverdue) return a.balance.isOverdue ? -1 : 1;
  if (a.dueOn !== b.dueOn) {
    if (a.dueOn === null) return 1;
    if (b.dueOn === null) return -1;
    return a.dueOn.localeCompare(b.dueOn);
  }
  return a.person.localeCompare(b.person);
}

/** What is still owed on one utang, or null when it doesn't exist or isn't the user's. */
export async function getOutstanding(
  utangId: string,
): Promise<{ remainingCents: number; currency: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("utang")
    .select("amount_cents, currency, payments:utang_payments(amount_cents)")
    .eq("id", utangId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const paidCents = data.payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  return { remainingCents: Math.max(data.amount_cents - paidCents, 0), currency: data.currency };
}

/** Paid-off utang, most recently settled first. */
export function settledNewestFirst(items: readonly UtangWithPayments[]): UtangWithPayments[] {
  return items
    .filter((item) => item.balance.isSettled)
    .sort((a, b) => (b.settledOn ?? "").localeCompare(a.settledOn ?? ""));
}
