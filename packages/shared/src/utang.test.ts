import { describe, expect, it } from "vitest";
import {
  blankUtangInput,
  filterUtang,
  hasActiveUtangFilters,
  NO_UTANG_FILTERS,
  settledOn,
  utangDueState,
  UTANG_NOTE_MAX_LENGTH,
  UTANG_PERSON_MAX_LENGTH,
  utangBalance,
  utangToInput,
  utangTotalsByCurrency,
  validateUtangInput,
  validateUtangPaymentInput,
  type UtangInput,
} from "./utang";

const valid: UtangInput = {
  direction: "owed_to_me",
  person: "  Juan   Dela Cruz ",
  amount: "1,500",
  currency: "php",
  incurredOn: "2026-10-01",
  dueOn: "2026-10-31",
  note: " Concert tickets ",
  accountId: "",
};

function errorFor(overrides: Partial<UtangInput>): string | undefined {
  const result = validateUtangInput({ ...valid, ...overrides });
  return result.ok ? undefined : result.error;
}

describe("validateUtangInput", () => {
  it("accepts and normalises a complete utang", () => {
    expect(validateUtangInput(valid)).toEqual({
      ok: true,
      utang: {
        direction: "owed_to_me",
        person: "Juan Dela Cruz",
        amountCents: 150000,
        currency: "PHP",
        incurredOn: "2026-10-01",
        dueOn: "2026-10-31",
        note: "Concert tickets",
        accountId: null,
      },
    });
  });

  it("treats an empty due date and note as none", () => {
    const result = validateUtangInput({ ...valid, dueOn: " ", note: "" });
    expect(result.ok && result.utang.dueOn).toBeNull();
    expect(result.ok && result.utang.note).toBeNull();
  });

  it("rejects bad input with a readable reason", () => {
    expect(errorFor({ direction: "lent" })).toMatch(/owe/);
    expect(errorFor({ person: "   " })).toBe("Enter who this is with.");
    expect(errorFor({ person: "x".repeat(UTANG_PERSON_MAX_LENGTH + 1) })).toMatch(/80/);
    expect(errorFor({ amount: "" })).toBe("Enter an amount.");
    expect(errorFor({ amount: "0" })).toMatch(/more than zero/);
    expect(errorFor({ currency: "XX" })).toMatch(/currency/);
    expect(errorFor({ incurredOn: "2026-02-30" })).toMatch(/started/);
    expect(errorFor({ dueOn: "soon" })).toMatch(/due date/);
    expect(errorFor({ dueOn: "2026-09-30" })).toMatch(/before/);
    expect(errorFor({ note: "x".repeat(UTANG_NOTE_MAX_LENGTH + 1) })).toMatch(/500/);
  });

  it("keeps a chosen account and refuses a malformed one", () => {
    const account = "0B6F7C1E-3A52-4D8E-9F10-2C3D4E5F6A7B";
    const result = validateUtangInput({ ...valid, accountId: account });
    expect(result.ok && result.utang.accountId).toBe(account.toLowerCase());
    expect(errorFor({ accountId: "gcash" })).toMatch(/account/);
  });

  it("round-trips through utangToInput", () => {
    const result = validateUtangInput(valid);
    if (!result.ok) throw new Error(result.error);
    expect(validateUtangInput(utangToInput(result.utang))).toEqual(result);
  });

  it("starts blank forms as money owed to the person, dated today", () => {
    expect(blankUtangInput("PHP", "2026-10-24")).toMatchObject({
      direction: "owed_to_me",
      currency: "PHP",
      incurredOn: "2026-10-24",
      dueOn: "",
    });
  });
});

describe("validateUtangPaymentInput", () => {
  const outstanding = { remainingCents: 50000, currency: "USD" };

  it("accepts a payment up to what is still owed", () => {
    expect(validateUtangPaymentInput({ amount: "500", paidOn: "2026-10-20", note: "", accountId: "" }, outstanding)).toEqual({
      ok: true,
      payment: { amountCents: 50000, paidOn: "2026-10-20", note: null, accountId: null },
    });
  });

  it("refuses overpaying, paying a settled utang, and bad dates", () => {
    const pay = (amount: string, remainingCents = 50000, paidOn = "2026-10-20") =>
      validateUtangPaymentInput({ amount, paidOn, note: "", accountId: "" }, { remainingCents, currency: "USD" });
    expect(pay("500.01")).toEqual({ ok: false, error: "That's more than the $500.00 still owed." });
    expect(pay("1", 0)).toEqual({ ok: false, error: "This is already fully paid." });
    expect(pay("10", 50000, "2026-13-01")).toEqual({ ok: false, error: "Enter a valid date." });
  });
});

describe("utangBalance", () => {
  const utang = { amountCents: 10000, dueOn: "2026-10-15" };

  it("tracks partial payment and overdue status", () => {
    expect(utangBalance(utang, [{ amountCents: 2500 }], "2026-10-16")).toEqual({
      paidCents: 2500,
      remainingCents: 7500,
      ratio: 0.25,
      isSettled: false,
      isOverdue: true,
    });
  });

  it("is settled, and never overdue, once fully paid", () => {
    const balance = utangBalance(utang, [{ amountCents: 4000 }, { amountCents: 6000 }], "2026-12-01");
    expect(balance).toMatchObject({ remainingCents: 0, ratio: 1, isSettled: true, isOverdue: false });
  });

  it("is not overdue on its due date or without one", () => {
    expect(utangBalance(utang, [], "2026-10-15").isOverdue).toBe(false);
    expect(utangBalance({ amountCents: 100, dueOn: null }, [], "2030-01-01").isOverdue).toBe(false);
  });
});

describe("utangTotalsByCurrency", () => {
  it("sums what is still owed each way, per currency", () => {
    expect(
      utangTotalsByCurrency([
        { direction: "owed_to_me", currency: "PHP", remainingCents: 5000 },
        { direction: "i_owe", currency: "PHP", remainingCents: 2000 },
        { direction: "owed_to_me", currency: "PHP", remainingCents: 0 },
        { direction: "i_owe", currency: "USD", remainingCents: 300 },
      ]),
    ).toEqual([
      { currency: "PHP", owedToMeCents: 5000, iOweCents: 2000, netCents: 3000 },
      { currency: "USD", owedToMeCents: 0, iOweCents: 300, netCents: -300 },
    ]);
  });
});

describe("settledOn", () => {
  it("is the latest payment date once settled, and null before", () => {
    const payments = [{ paidOn: "2026-10-03" }, { paidOn: "2026-10-12" }, { paidOn: "2026-09-01" }];
    expect(settledOn({ isSettled: true }, payments)).toBe("2026-10-12");
    expect(settledOn({ isSettled: false }, payments)).toBeNull();
  });
});

describe("filterUtang", () => {
  const juan = {
    id: "juan",
    direction: "owed_to_me" as const,
    person: "Juan Dela Cruz",
    amountCents: 150000,
    currency: "PHP",
    note: "Concert tickets",
    dueOn: "2026-10-10" as string | null,
    payments: [{ note: "via GCash" }],
    balance: { isOverdue: true },
  };
  const lea = {
    ...juan,
    id: "lea",
    person: "Lea Reyes",
    currency: "USD",
    note: null,
    dueOn: null,
    payments: [],
    balance: { isOverdue: false },
  };
  const mama = {
    ...juan,
    id: "mama",
    direction: "i_owe" as const,
    person: "Mama",
    note: "Laptop",
    dueOn: "2026-12-01",
    balance: { isOverdue: false },
  };
  const all = [juan, lea, mama];
  const ids = (filters: Partial<typeof NO_UTANG_FILTERS>) =>
    filterUtang(all, { ...NO_UTANG_FILTERS, ...filters }).map((item) => item.id);

  it("keeps everything with no filters", () => {
    expect(ids({})).toEqual(["juan", "lea", "mama"]);
    expect(hasActiveUtangFilters(NO_UTANG_FILTERS)).toBe(false);
  });

  it("searches person, note, payment notes, and amount, every word in any order", () => {
    expect(ids({ search: "cruz juan" })).toEqual(["juan"]);
    expect(ids({ search: "gcash" })).toEqual(["juan", "mama"]);
    expect(ids({ search: "1,500" })).toEqual(["juan", "lea", "mama"]);
    expect(ids({ search: "laptop" })).toEqual(["mama"]);
  });

  it("hides directions and currencies", () => {
    expect(ids({ hiddenDirections: ["i_owe"] })).toEqual(["juan", "lea"]);
    expect(ids({ hiddenCurrencies: ["PHP"] })).toEqual(["lea"]);
    expect(hasActiveUtangFilters({ ...NO_UTANG_FILTERS, hiddenCurrencies: ["PHP"] })).toBe(true);
  });

  it("hides by where each stands against its due date", () => {
    expect(ids({ hiddenDueStates: ["overdue"] })).toEqual(["lea", "mama"]);
    expect(ids({ hiddenDueStates: ["upcoming", "no_due_date"] })).toEqual(["juan"]);
  });
});

describe("utangDueState", () => {
  it("is overdue, due later, or undated", () => {
    expect(utangDueState({ dueOn: "2026-10-01", balance: { isOverdue: true } })).toBe("overdue");
    expect(utangDueState({ dueOn: "2026-12-01", balance: { isOverdue: false } })).toBe("upcoming");
    expect(utangDueState({ dueOn: null, balance: { isOverdue: false } })).toBe("no_due_date");
  });
});
