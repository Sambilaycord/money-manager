import { describe, expect, it } from "vitest";
import { availableCents, budgetLeftByCurrency, moneyPictureByCurrency } from "./money-picture";

const FOOD = "2d8b9e30-5c74-4fa0-9b32-4e5f6a7b8c9d";
const FUN = "3e9caf41-6d85-40b1-8c43-5f6a7b8c9d0e";
const TRAVEL = "4fa0b052-7e96-41c2-9d54-6a7b8c9d0e1f";

const monthly = (categoryId: string, amountCents: number, currency = "PHP") => ({
  categoryId,
  amountCents,
  currency,
  period: "monthly" as const,
  startMonth: null,
  endMonth: null,
});

const spend = (categoryId: string, amountCents: number, currency = "PHP") => ({
  type: "expense" as const,
  categoryId,
  amountCents,
  currency,
});

describe("budgetLeftByCurrency", () => {
  it("sums what each budget still has, never letting an overspent one count below zero", () => {
    expect(
      budgetLeftByCurrency(
        [monthly(FOOD, 10_000), monthly(FUN, 3_000), monthly(TRAVEL, 500, "USD")],
        [spend(FOOD, 4_000), spend(FUN, 5_000), spend(TRAVEL, 100, "USD")],
        "2026-10",
      ),
    ).toEqual([
      { currency: "PHP", cents: 6_000 },
      { currency: "USD", cents: 400 },
    ]);
  });
});

describe("moneyPictureByCurrency", () => {
  it("connects accounts, set-asides, budgets, cards, and utang per currency", () => {
    const [php, usd] = moneyPictureByCurrency({
      accounts: [
        { type: "bank", currency: "PHP", balanceCents: 100_000, setAsideCents: 20_000 },
        { type: "e_wallet", currency: "PHP", balanceCents: 10_000, setAsideCents: 5_000 },
        { type: "credit_card", currency: "PHP", balanceCents: -15_000, setAsideCents: 0 },
        { type: "cash", currency: "USD", balanceCents: 4_000, setAsideCents: 0 },
      ],
      budgetLeft: [{ currency: "PHP", cents: 30_000 }],
      utang: [
        { direction: "owed_to_me", currency: "PHP", remainingCents: 7_000 },
        { direction: "i_owe", currency: "PHP", remainingCents: 2_000 },
      ],
    });
    expect(php).toEqual({
      currency: "PHP",
      heldCents: 110_000,
      setAsideCents: 25_000,
      budgetLeftCents: 30_000,
      freeToSpendCents: 55_000,
      cardDebtCents: 15_000,
      owedToYouCents: 7_000,
      youOweCents: 2_000,
      netWorthCents: 100_000,
    });
    expect(usd).toMatchObject({ currency: "USD", heldCents: 4_000, freeToSpendCents: 4_000 });
  });

  it("goes negative when plans exceed the money, rather than hiding it", () => {
    const [picture] = moneyPictureByCurrency({
      accounts: [{ type: "bank", currency: "PHP", balanceCents: 1_000, setAsideCents: 800 }],
      budgetLeft: [{ currency: "PHP", cents: 500 }],
      utang: [],
    });
    expect(picture?.freeToSpendCents).toBe(-300);
  });
});

describe("availableCents", () => {
  it("is the balance less what's set aside", () => {
    expect(availableCents({ balanceCents: 5_000, setAsideCents: 1_200 })).toBe(3_800);
  });
});
