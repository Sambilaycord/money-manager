import { describe, expect, it } from "vitest";
import {
  budgetCoversMonth,
  budgetProgress,
  budgetsForMonth,
  budgetToInput,
  monthlyLimitCents,
  spentAgainstBudget,
  validateBudgetInput,
  type BudgetInput,
} from "./budgets";

const GROCERIES = "2d8b9e30-5c74-4fa0-9b32-4e5f6a7b8c9d";
const EATING_OUT = "3e9caf41-6d85-4fb1-8c43-5f6a7b8c9d0e";

const valid: BudgetInput = {
  categoryId: GROCERIES,
  amount: "5,000",
  currency: "php",
  period: "monthly",
  startMonth: "",
  endMonth: "",
};

function errorFor(overrides: Partial<BudgetInput>): string | undefined {
  const result = validateBudgetInput({ ...valid, ...overrides });
  return result.ok ? undefined : result.error;
}

describe("validateBudgetInput", () => {
  it("accepts a complete budget and normalises it", () => {
    expect(validateBudgetInput({ ...valid, categoryId: GROCERIES.toUpperCase() })).toEqual({
      ok: true,
      budget: {
        categoryId: GROCERIES,
        amountCents: 500000,
        currency: "PHP",
        period: "monthly",
        startMonth: null,
        endMonth: null,
      },
    });
  });

  it("requires a category", () => {
    expect(errorFor({ categoryId: "" })).toBe("Choose a category.");
    expect(errorFor({ categoryId: "groceries" })).toBe("Choose a category.");
  });

  it("rejects missing, malformed, zero, and oversized limits", () => {
    expect(errorFor({ amount: "" })).toBe("Enter a limit.");
    expect(errorFor({ amount: "-100" })).toBe("Enter the limit as a number, like 5,000.");
    expect(errorFor({ amount: "0" })).toBe("The limit has to be more than zero.");
    expect(errorFor({ amount: "1000000000000" })).toMatch(/largest amount/);
  });

  it("requires a known period", () => {
    expect(errorFor({ period: "weekly" })).toBe("Choose how long the budget runs.");
    expect(validateBudgetInput({ ...valid, period: "yearly" }).ok).toBe(true);
  });

  it("keeps the months of a range and ignores them otherwise", () => {
    const range = validateBudgetInput({
      ...valid,
      period: "range",
      startMonth: "2027-01",
      endMonth: "2027-03",
    });
    expect(range.ok && range.budget).toMatchObject({ startMonth: "2027-01", endMonth: "2027-03" });
    const monthly = validateBudgetInput({ ...valid, startMonth: "2027-01", endMonth: "2027-03" });
    expect(monthly.ok && monthly.budget).toMatchObject({ startMonth: null, endMonth: null });
  });

  it("requires a range's months in order", () => {
    const range = { ...valid, period: "range" };
    expect(errorFor({ ...range, startMonth: "", endMonth: "2027-03" })).toBe(
      "Choose the first and last month.",
    );
    expect(errorFor({ ...range, startMonth: "2027-04", endMonth: "2027-03" })).toBe(
      "The last month can't come before the first.",
    );
    expect(errorFor({ ...range, startMonth: "2027-03", endMonth: "2027-03" })).toBeUndefined();
  });

  it("rejects an unknown currency", () => {
    expect(errorFor({ currency: "ZZZ" })).toBe("Choose a currency from the list.");
  });

  it("round-trips through the edit form", () => {
    for (const input of [valid, { ...valid, period: "range", startMonth: "2027-01", endMonth: "2027-03" }]) {
      const result = validateBudgetInput(input);
      if (!result.ok) throw new Error(result.error);
      expect(validateBudgetInput(budgetToInput(result.budget))).toEqual(result);
    }
  });
});

const ongoing = { startMonth: null, endMonth: null };

describe("monthlyLimitCents", () => {
  it("uses a monthly budget as it is", () => {
    expect(monthlyLimitCents({ amountCents: 500000, period: "monthly", ...ongoing }, "2026-10")).toBe(
      500000,
    );
  });

  it("splits a yearly budget into twelve shares", () => {
    expect(monthlyLimitCents({ amountCents: 1200000, period: "yearly", ...ongoing }, "2026-03")).toBe(
      100000,
    );
  });

  it("gives leftover cents to the first months so the year adds up exactly", () => {
    const yearly = { amountCents: 1000003, period: "yearly" as const, ...ongoing };
    const months = Array.from({ length: 12 }, (_, index) =>
      monthlyLimitCents(yearly, `2026-${String(index + 1).padStart(2, "0")}`),
    );
    expect(months.slice(0, 7)).toEqual(Array(7).fill(83334));
    expect(months.slice(7)).toEqual(Array(5).fill(83333));
    expect(months.reduce((total, cents) => total + cents, 0)).toBe(1000003);
  });

  it("splits a range's total across its months, exactly, and is 0 outside it", () => {
    const trip = {
      amountCents: 3000001,
      period: "range" as const,
      startMonth: "2026-12",
      endMonth: "2027-02",
    };
    const shares = ["2026-12", "2027-01", "2027-02"].map((month) => monthlyLimitCents(trip, month));
    expect(shares).toEqual([1000001, 1000000, 1000000]);
    expect(monthlyLimitCents(trip, "2026-11")).toBe(0);
    expect(monthlyLimitCents(trip, "2027-03")).toBe(0);
  });

  it("gives a single-month range its whole amount", () => {
    const december = { amountCents: 800000, period: "range" as const, startMonth: "2026-12", endMonth: "2026-12" };
    expect(monthlyLimitCents(december, "2026-12")).toBe(800000);
  });
});

describe("budgetCoversMonth", () => {
  it("covers every month when ongoing, and only its span when a range", () => {
    expect(budgetCoversMonth({ amountCents: 1, period: "yearly", ...ongoing }, "1999-01")).toBe(true);
    const range = { amountCents: 1, period: "range" as const, startMonth: "2027-01", endMonth: "2027-03" };
    expect(["2026-12", "2027-01", "2027-03", "2027-04"].map((m) => budgetCoversMonth(range, m))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});

describe("budgetsForMonth", () => {
  const food = { id: "food", categoryId: GROCERIES, amountCents: 300000, period: "monthly" as const, ...ongoing };
  const december = {
    id: "december",
    categoryId: GROCERIES,
    amountCents: 800000,
    period: "range" as const,
    startMonth: "2026-12",
    endMonth: "2026-12",
  };
  const trip = {
    id: "trip",
    categoryId: EATING_OUT,
    amountCents: 900000,
    period: "range" as const,
    startMonth: "2027-01",
    endMonth: "2027-03",
  };
  const ids = (month: string) => budgetsForMonth([food, december, trip], month).map((b) => b.id).sort();

  it("uses the ongoing budget where no range covers the month", () => {
    expect(ids("2026-11")).toEqual(["food"]);
  });

  it("lets a range stand in for the ongoing budget in its months", () => {
    expect(ids("2026-12")).toEqual(["december"]);
  });

  it("picks each category separately", () => {
    expect(ids("2027-02")).toEqual(["food", "trip"]);
  });
});

describe("budgetProgress", () => {
  it("is on track below 80%", () => {
    expect(budgetProgress(10000, 7999)).toMatchObject({ status: "on_track", remainingCents: 2001 });
  });

  it("is near the limit from 80% up to the limit itself", () => {
    expect(budgetProgress(10000, 8000).status).toBe("near_limit");
    expect(budgetProgress(10000, 10000)).toMatchObject({ status: "near_limit", remainingCents: 0 });
  });

  it("is over once spending passes the limit", () => {
    expect(budgetProgress(10000, 12500)).toMatchObject({
      status: "over",
      remainingCents: -2500,
      ratio: 1.25,
    });
  });

  it("is on track with nothing spent", () => {
    expect(budgetProgress(10000, 0)).toMatchObject({ status: "on_track", ratio: 0 });
  });
});

describe("spentAgainstBudget", () => {
  const spend = (overrides: Partial<Parameters<typeof spentAgainstBudget>[1][number]>) => ({
    type: "expense" as const,
    amountCents: 1000,
    currency: "PHP",
    categoryId: GROCERIES,
    ...overrides,
  });

  it("adds the category's expenses in the budget's currency only", () => {
    expect(
      spentAgainstBudget({ categoryId: GROCERIES, currency: "PHP" }, [
        spend({}),
        spend({ amountCents: 2500 }),
        spend({ categoryId: EATING_OUT }),
        spend({ currency: "USD" }),
        spend({ type: "income" }),
      ]),
    ).toBe(3500);
  });
});
