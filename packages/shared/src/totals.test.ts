import { describe, expect, it } from "vitest";
import {
  cashFlowByCurrency,
  cashFlowByMonth,
  chartCurrency,
  netWorthByCurrency,
  spendingByCategory,
} from "./totals";

const FOOD = "2d8b9e30-5c74-4fa0-9b32-4e5f6a7b8c9d";
const RENT = "3e9caf41-6d85-40b1-8c43-5f6a7b8c9d0e";

function tx(
  type: "income" | "expense" | "transfer",
  amountCents: number,
  extra: { currency?: string; occurredOn?: string; categoryId?: string | null; categoryName?: string | null } = {},
) {
  return {
    type,
    amountCents,
    currency: extra.currency ?? "PHP",
    occurredOn: extra.occurredOn ?? "2026-10-05",
    categoryId: extra.categoryId ?? null,
    categoryName: extra.categoryName ?? null,
  };
}

describe("cashFlowByCurrency", () => {
  it("totals income and spending per currency and ignores transfers", () => {
    expect(
      cashFlowByCurrency([
        tx("income", 50_000_00),
        tx("expense", 1_250_50),
        tx("transfer", 10_000_00),
        tx("expense", 20_00, { currency: "USD" }),
      ]),
    ).toEqual([
      { currency: "PHP", incomeCents: 50_000_00, expenseCents: 1_250_50 },
      { currency: "USD", incomeCents: 0, expenseCents: 20_00 },
    ]);
  });

  it("returns nothing for transfers only", () => {
    expect(cashFlowByCurrency([tx("transfer", 100)])).toEqual([]);
  });
});

describe("cashFlowByMonth", () => {
  it("fills empty months with zero and skips other currencies", () => {
    expect(
      cashFlowByMonth(
        [
          tx("income", 900, { occurredOn: "2026-09-30" }),
          tx("expense", 300, { occurredOn: "2026-10-01" }),
          tx("expense", 999, { occurredOn: "2026-10-01", currency: "USD" }),
        ],
        ["2026-08", "2026-09", "2026-10"],
        "PHP",
      ),
    ).toEqual([
      { month: "2026-08", incomeCents: 0, expenseCents: 0 },
      { month: "2026-09", incomeCents: 900, expenseCents: 0 },
      { month: "2026-10", incomeCents: 0, expenseCents: 300 },
    ]);
  });
});

describe("spendingByCategory", () => {
  it("groups expenses in one currency, largest first, keeping uncategorised apart", () => {
    expect(
      spendingByCategory(
        [
          tx("expense", 200, { categoryId: FOOD, categoryName: "Food" }),
          tx("expense", 15_000, { categoryId: RENT, categoryName: "Rent" }),
          tx("expense", 300, { categoryId: FOOD, categoryName: "Food" }),
          tx("expense", 50),
          tx("income", 99_999, { categoryId: FOOD, categoryName: "Food" }),
          tx("expense", 99_999, { categoryId: FOOD, categoryName: "Food", currency: "USD" }),
        ],
        "PHP",
      ),
    ).toEqual([
      { categoryId: RENT, categoryName: "Rent", cents: 15_000 },
      { categoryId: FOOD, categoryName: "Food", cents: 500 },
      { categoryId: null, categoryName: null, cents: 50 },
    ]);
  });
});

describe("netWorthByCurrency", () => {
  it("separates what is held from what is owed on credit cards", () => {
    expect(
      netWorthByCurrency([
        { type: "bank", currency: "PHP", balanceCents: 10_000 },
        { type: "credit_card", currency: "PHP", balanceCents: -2_500 },
        { type: "credit_card", currency: "PHP", balanceCents: 300 },
        { type: "cash", currency: "USD", balanceCents: 4_000 },
      ]),
    ).toEqual([
      { currency: "PHP", haveCents: 10_300, owedCents: 2_500, netCents: 7_800, hasCreditCards: true },
      { currency: "USD", haveCents: 4_000, owedCents: 0, netCents: 4_000, hasCreditCards: false },
    ]);
  });
});

describe("chartCurrency", () => {
  it("prefers the default currency, then the first available", () => {
    expect(chartCurrency(["USD", "PHP"], "PHP")).toBe("PHP");
    expect(chartCurrency(["USD", "EUR"], "PHP")).toBe("USD");
    expect(chartCurrency([], "PHP")).toBeNull();
  });
});
