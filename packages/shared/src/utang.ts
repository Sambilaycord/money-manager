// Utang: money lent to or borrowed from people. An utang and each repayment
// can name an account, which moves its balance (see the account_balances
// view); without one it is just a record of who owes whom. Lending and
// borrowing are never income or spending. Mirrors the utang and
// utang_payments tables.

import { isCalendarDate } from "./dates";
import { isUuid } from "./ids";
import { centsToAmountInput, formatMoney, isCurrencyCode } from "./money";
import { matchesSearchText, normalizeSearch } from "./transaction-filters";
import { validateAmount } from "./transactions";

/** In the order the form offers them. Mirrors the utang.direction CHECK constraint. */
export const UTANG_DIRECTIONS = ["owed_to_me", "i_owe"] as const;

export type UtangDirection = (typeof UTANG_DIRECTIONS)[number];

export const UTANG_DIRECTION_LABELS: Record<
  UtangDirection,
  { option: string; heading: string; person: string; settledVerb: string }
> = {
  owed_to_me: {
    option: "Someone owes me",
    heading: "Owed to you",
    person: "Who owes you",
    settledVerb: "Paid you back",
  },
  i_owe: {
    option: "I owe someone",
    heading: "You owe",
    person: "Who you owe",
    settledVerb: "You paid back",
  },
};

/** Match the CHECK constraints on utang and utang_payments. */
export const UTANG_PERSON_MAX_LENGTH = 80;
export const UTANG_NOTE_MAX_LENGTH = 500;
export const UTANG_PAYMENT_NOTE_MAX_LENGTH = 200;

export function isUtangDirection(value: unknown): value is UtangDirection {
  return typeof value === "string" && (UTANG_DIRECTIONS as readonly string[]).includes(value);
}

/** What the add and edit utang forms send, before any of it is trusted. */
export interface UtangInput {
  direction: string;
  person: string;
  amount: string;
  currency: string;
  /** YYYY-MM-DD. */
  incurredOn: string;
  /** YYYY-MM-DD, or empty for no due date. */
  dueOn: string;
  note: string;
  /**
   * The account the money left (lending) or arrived in (borrowing), or empty
   * when it isn't tracked in an account.
   */
  accountId: string;
}

export interface ValidUtang {
  direction: UtangDirection;
  person: string;
  /** The full amount lent or borrowed; always positive. */
  amountCents: number;
  currency: string;
  incurredOn: string;
  dueOn: string | null;
  note: string | null;
  accountId: string | null;
}

export type UtangInputResult = { ok: true; utang: ValidUtang } | { ok: false; error: string };

export function validateUtangInput(input: UtangInput): UtangInputResult {
  // Inner runs of spaces collapse so "Juan  Dela Cruz" and "Juan Dela Cruz" match.
  const person = input.person.trim().replace(/\s+/g, " ");
  const currency = input.currency.trim().toUpperCase();
  const incurredOn = input.incurredOn.trim();
  const dueOn = input.dueOn.trim();
  const note = input.note.trim();
  // Lowercased to match how Postgres returns uuids.
  const accountId = input.accountId.trim().toLowerCase();

  if (!isUtangDirection(input.direction)) {
    return { ok: false, error: "Choose whether they owe you or you owe them." };
  }
  if (!person) return { ok: false, error: "Enter who this is with." };
  if (person.length > UTANG_PERSON_MAX_LENGTH) {
    return { ok: false, error: `Keep the name to ${UTANG_PERSON_MAX_LENGTH} characters or fewer.` };
  }

  const amount = validateAmount(input.amount.trim());
  if (!amount.ok) return amount;
  if (!isCurrencyCode(currency)) return { ok: false, error: "Choose a currency from the list." };

  if (!isCalendarDate(incurredOn)) return { ok: false, error: "Enter a valid date for when it started." };
  if (dueOn && !isCalendarDate(dueOn)) return { ok: false, error: "Enter a valid due date, or leave it empty." };
  // Plain string comparison works because both are zero-padded YYYY-MM-DD.
  if (dueOn && dueOn < incurredOn) {
    return { ok: false, error: "The due date can't be before the date it started." };
  }
  if (note.length > UTANG_NOTE_MAX_LENGTH) {
    return { ok: false, error: `Keep the note to ${UTANG_NOTE_MAX_LENGTH} characters or fewer.` };
  }
  if (accountId && !isUuid(accountId)) return { ok: false, error: "Choose an account from the list." };

  return {
    ok: true,
    utang: {
      direction: input.direction,
      person,
      amountCents: amount.cents,
      currency,
      incurredOn,
      dueOn: dueOn || null,
      note: note || null,
      accountId: accountId || null,
    },
  };
}

/** A saved utang as the form fields that would recreate it, for prefilling the edit form. */
export function utangToInput(utang: ValidUtang): UtangInput {
  return {
    direction: utang.direction,
    person: utang.person,
    amount: centsToAmountInput(utang.amountCents),
    currency: utang.currency,
    incurredOn: utang.incurredOn,
    dueOn: utang.dueOn ?? "",
    note: utang.note ?? "",
    accountId: utang.accountId ?? "",
  };
}

export function blankUtangInput(currency: string, today: string): UtangInput {
  return {
    direction: "owed_to_me",
    person: "",
    amount: "",
    currency,
    incurredOn: today,
    dueOn: "",
    note: "",
    accountId: "",
  };
}

export interface UtangPaymentInput {
  amount: string;
  /** YYYY-MM-DD. */
  paidOn: string;
  note: string;
  /** Where the money arrived (owed to me) or came from (I owe); empty when untracked. */
  accountId: string;
}

export interface ValidUtangPayment {
  amountCents: number;
  paidOn: string;
  note: string | null;
  accountId: string | null;
}

export type UtangPaymentInputResult =
  | { ok: true; payment: ValidUtangPayment }
  | { ok: false; error: string };

/**
 * Checks a repayment against what is still owed, so a typo can't settle a debt
 * twice over. The database enforces the same ceiling.
 */
export function validateUtangPaymentInput(
  input: UtangPaymentInput,
  outstanding: { remainingCents: number; currency: string },
): UtangPaymentInputResult {
  const { remainingCents, currency } = outstanding;
  const paidOn = input.paidOn.trim();
  const note = input.note.trim();
  const accountId = input.accountId.trim().toLowerCase();

  if (remainingCents <= 0) return { ok: false, error: "This is already fully paid." };
  const amount = validateAmount(input.amount.trim());
  if (!amount.ok) return amount;
  if (amount.cents > remainingCents) {
    return {
      ok: false,
      error: `That's more than the ${formatMoney(remainingCents, currency)} still owed.`,
    };
  }
  if (!isCalendarDate(paidOn)) return { ok: false, error: "Enter a valid date." };
  if (note.length > UTANG_PAYMENT_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the note to ${UTANG_PAYMENT_NOTE_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (accountId && !isUuid(accountId)) return { ok: false, error: "Choose an account from the list." };

  return {
    ok: true,
    payment: { amountCents: amount.cents, paidOn, note: note || null, accountId: accountId || null },
  };
}

export interface UtangBalance {
  paidCents: number;
  /** Zero once settled; never negative. */
  remainingCents: number;
  /** paid ÷ amount, from 0 to 1. */
  ratio: number;
  isSettled: boolean;
  /** Still owed and past its due date. */
  isOverdue: boolean;
}

export function utangBalance(
  utang: Pick<ValidUtang, "amountCents" | "dueOn">,
  payments: readonly { amountCents: number }[],
  today: string,
): UtangBalance {
  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const remainingCents = Math.max(utang.amountCents - paidCents, 0);
  const isSettled = remainingCents === 0;
  return {
    paidCents,
    remainingCents,
    ratio: Math.min(paidCents / utang.amountCents, 1),
    isSettled,
    isOverdue: !isSettled && utang.dueOn !== null && utang.dueOn < today,
  };
}

export interface UtangTotals {
  currency: string;
  /** Still owed to the person, across everyone. */
  owedToMeCents: number;
  /** Still owed by the person, across everyone. */
  iOweCents: number;
  /** owedToMe − iOwe: positive means more is coming in than going out. */
  netCents: number;
}

/** Outstanding amounts per currency; settled utang add nothing. */
export function utangTotalsByCurrency(
  items: readonly { direction: UtangDirection; currency: string; remainingCents: number }[],
): UtangTotals[] {
  const totals = new Map<string, UtangTotals>();
  for (const item of items) {
    const current = totals.get(item.currency) ?? {
      currency: item.currency,
      owedToMeCents: 0,
      iOweCents: 0,
      netCents: 0,
    };
    const owedToMe = item.direction === "owed_to_me" ? item.remainingCents : 0;
    const iOwe = item.direction === "i_owe" ? item.remainingCents : 0;
    totals.set(item.currency, {
      ...current,
      owedToMeCents: current.owedToMeCents + owedToMe,
      iOweCents: current.iOweCents + iOwe,
      netCents: current.netCents + owedToMe - iOwe,
    });
  }
  return [...totals.values()];
}

/** The date an utang was paid off: its latest payment. Null while anything is still owed. */
export function settledOn(
  balance: Pick<UtangBalance, "isSettled">,
  payments: readonly { paidOn: string }[],
): string | null {
  if (!balance.isSettled) return null;
  return payments.reduce<string | null>(
    (latest, payment) => (latest === null || payment.paidOn > latest ? payment.paidOn : latest),
    null,
  );
}

/** Where an open utang stands against its due date. */
export const UTANG_DUE_STATES = ["overdue", "upcoming", "no_due_date"] as const;

export type UtangDueState = (typeof UTANG_DUE_STATES)[number];

export const UTANG_DUE_STATE_LABELS: Record<UtangDueState, string> = {
  overdue: "Overdue",
  upcoming: "Due later",
  no_due_date: "No due date",
};

export function isUtangDueState(value: unknown): value is UtangDueState {
  return typeof value === "string" && (UTANG_DUE_STATES as readonly string[]).includes(value);
}

export function utangDueState(utang: {
  dueOn: string | null;
  balance: Pick<UtangBalance, "isOverdue">;
}): UtangDueState {
  if (utang.balance.isOverdue) return "overdue";
  return utang.dueOn === null ? "no_due_date" : "upcoming";
}

/**
 * What to leave out, rather than what to keep, so everything shows by default
 * and a currency used for the first time shows up without anyone opting in.
 */
export interface UtangFilters {
  search: string;
  hiddenDirections: readonly UtangDirection[];
  hiddenCurrencies: readonly string[];
  hiddenDueStates: readonly UtangDueState[];
}

export const NO_UTANG_FILTERS: UtangFilters = {
  search: "",
  hiddenDirections: [],
  hiddenCurrencies: [],
  hiddenDueStates: [],
};

export function hasActiveUtangFilters(filters: UtangFilters): boolean {
  return (
    normalizeSearch(filters.search) !== "" ||
    filters.hiddenDirections.length > 0 ||
    filters.hiddenCurrencies.length > 0 ||
    filters.hiddenDueStates.length > 0
  );
}

type FilterableUtang = Pick<
  ValidUtang,
  "direction" | "person" | "amountCents" | "currency" | "note" | "dueOn"
> & {
  payments: readonly { note: string | null }[];
  balance: Pick<UtangBalance, "isOverdue">;
};

function searchableText(utang: FilterableUtang): string {
  return [
    utang.person,
    utang.note,
    ...utang.payments.map((payment) => payment.note),
    // So "1500" and "1500.00" find an amount of 1,500.00.
    centsToAmountInput(utang.amountCents),
  ]
    .filter((field): field is string => field !== null)
    .join(" ");
}

export function filterUtang<T extends FilterableUtang>(items: readonly T[], filters: UtangFilters): T[] {
  return items.filter(
    (item) =>
      !filters.hiddenDirections.includes(item.direction) &&
      !filters.hiddenCurrencies.includes(item.currency) &&
      !filters.hiddenDueStates.includes(utangDueState(item)) &&
      matchesSearchText(searchableText(item), filters.search),
  );
}
