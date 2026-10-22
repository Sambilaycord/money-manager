export type TransactionType = "income" | "expense" | "transfer";

export interface Account {
  id: string;
  name: string;
  currency: string;
  /** Balance in minor units (cents) to avoid floating-point errors. */
  balanceCents: number;
}

export interface Category {
  id: string;
  name: string;
  type: Exclude<TransactionType, "transfer">;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  /** Amount in minor units (cents), always positive; `type` gives direction. */
  amountCents: number;
  note: string | null;
  occurredAt: string;
}

export function formatMoney(cents: number, currency = "USD", locale?: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
