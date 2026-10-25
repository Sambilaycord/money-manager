import { describe, expect, it } from "vitest";
import {
  buildInsights,
  categoryTrends,
  daysInclusive,
  largestExpenses,
  monthlyReport,
  parseReportRange,
  percentChange,
  periodTotals,
  reportPeriod,
  spendingByAccount,
  spendingByWeekday,
  totalsByCategory,
  type ReportTransaction,
} from "./reports";

let nextId = 0;
function tx(
  type: ReportTransaction["type"],
  amountCents: number,
  occurredOn: string,
  extra: Partial<ReportTransaction> = {},
): ReportTransaction {
  nextId += 1;
  return {
    id: `t${nextId}`,
    type,
    amountCents,
    occurredOn,
    categoryId: null,
    categoryName: null,
    accountId: "a1",
    accountName: "BPI",
    note: null,
    ...extra,
  };
}

const food = { categoryId: "food", categoryName: "Food" };
const rent = { categoryId: "rent", categoryName: "Rent" };
const salary = { categoryId: "salary", categoryName: "Salary" };

describe("parseReportRange", () => {
  it.each([
    ["3", 3],
    ["6", 6],
    ["12", 12],
    [12, 12],
  ])("accepts %j", (value, expected) => {
    expect(parseReportRange(value)).toBe(expected);
  });

  it.each([undefined, "", "5", "24", "abc", "-6", ["6"]])("defaults %j to 6", (value) => {
    expect(parseReportRange(value)).toBe(6);
  });
});

describe("reportPeriod", () => {
  it("runs from the first of the earliest month to today", () => {
    const period = reportPeriod("2026-10-25", 3);
    expect(period.months).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(period.start).toBe("2026-08-01");
    expect(period.end).toBe("2026-10-25");
    expect(period.days).toBe(86);
  });

  it("compares against the same number of days just before", () => {
    const period = reportPeriod("2026-10-25", 3);
    expect(period.previous).toEqual({ start: "2026-05-07", end: "2026-07-31" });
    expect(daysInclusive(period.previous.start, period.previous.end)).toBe(period.days);
  });

  it("crosses a year boundary", () => {
    const period = reportPeriod("2026-02-10", 3);
    expect(period.months).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(period.start).toBe("2025-12-01");
  });
});

describe("periodTotals", () => {
  it("adds income and spending, ignoring transfers", () => {
    const totals = periodTotals([
      tx("income", 50_000_00, "2026-10-01"),
      tx("expense", 12_000_00, "2026-10-02"),
      tx("expense", 3_000_00, "2026-10-03"),
      tx("transfer", 9_999_00, "2026-10-04"),
    ]);
    expect(totals).toEqual({
      incomeCents: 50_000_00,
      expenseCents: 15_000_00,
      netCents: 35_000_00,
      savingsRate: 0.7,
      count: 3,
    });
  });

  it("has no savings rate without income", () => {
    expect(periodTotals([tx("expense", 100, "2026-10-01")]).savingsRate).toBeNull();
  });

  it("reports a negative savings rate when overspending", () => {
    const totals = periodTotals([tx("income", 100_00, "2026-10-01"), tx("expense", 150_00, "2026-10-02")]);
    expect(totals.savingsRate).toBe(-0.5);
  });
});

describe("percentChange", () => {
  it.each([
    [120, 100, 0.2],
    [80, 100, -0.2],
    [100, 100, 0],
    [-50, -100, 0.5],
  ])("from %d to %d is %d", (current, previous, expected) => {
    expect(percentChange(current, previous)).toBeCloseTo(expected);
  });

  it("is null with nothing to compare against", () => {
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("monthlyReport", () => {
  it("totals each month and runs a cumulative net", () => {
    const report = monthlyReport(
      [
        tx("income", 1000_00, "2026-08-05"),
        tx("expense", 400_00, "2026-08-20"),
        tx("expense", 700_00, "2026-09-03"),
        tx("income", 500_00, "2026-10-01"),
      ],
      ["2026-08", "2026-09", "2026-10"],
    );
    expect(report.map((month) => [month.month, month.netCents, month.cumulativeNetCents])).toEqual([
      ["2026-08", 600_00, 600_00],
      ["2026-09", -700_00, -100_00],
      ["2026-10", 500_00, 400_00],
    ]);
    expect(report[0]?.savingsRate).toBeCloseTo(0.6);
    expect(report[1]?.savingsRate).toBeNull();
  });
});

describe("totalsByCategory", () => {
  it("groups one type by category, largest first, with uncategorised kept", () => {
    const totals = totalsByCategory(
      [
        tx("expense", 300, "2026-10-01", food),
        tx("expense", 900, "2026-10-01", rent),
        tx("expense", 200, "2026-10-02", food),
        tx("expense", 50, "2026-10-02"),
        tx("income", 5000, "2026-10-02", salary),
      ],
      "expense",
    );
    expect(totals.map((total) => [total.categoryName, total.cents])).toEqual([
      ["Rent", 900],
      ["Food", 500],
      [null, 50],
    ]);
  });
});

describe("categoryTrends", () => {
  const months = ["2026-09", "2026-10"];
  const trends = categoryTrends(
    [
      tx("expense", 600_00, "2026-09-10", food),
      tx("expense", 400_00, "2026-10-10", food),
      tx("expense", 1000_00, "2026-10-01", rent),
    ],
    [tx("expense", 500_00, "2026-07-10", food), tx("expense", 80_00, "2026-07-11", { categoryId: "gym", categoryName: "Gym" })],
    months,
  );

  it("compares each category with the previous period", () => {
    const foodTrend = trends.find((trend) => trend.categoryId === "food");
    expect(foodTrend).toMatchObject({ cents: 1000_00, previousCents: 500_00, change: 1, share: 0.5, monthly: [600_00, 400_00] });
  });

  it("has no change figure for a new category", () => {
    expect(trends.find((trend) => trend.categoryId === "rent")?.change).toBeNull();
  });

  it("keeps categories that stopped, at zero", () => {
    expect(trends.find((trend) => trend.categoryId === "gym")).toMatchObject({ cents: 0, previousCents: 80_00, change: -1 });
  });

  it("sorts by current spending", () => {
    expect(trends.map((trend) => trend.categoryId)).toEqual(["food", "rent", "gym"]);
  });
});

describe("spendingByAccount", () => {
  it("totals spending per account", () => {
    const accounts = spendingByAccount([
      tx("expense", 100, "2026-10-01"),
      tx("expense", 300, "2026-10-01", { accountId: "a2", accountName: "GCash" }),
      tx("income", 999, "2026-10-01", { accountId: "a2", accountName: "GCash" }),
      tx("expense", 50, "2026-10-01"),
    ]);
    expect(accounts).toEqual([
      { accountId: "a2", accountName: "GCash", cents: 300 },
      { accountId: "a1", accountName: "BPI", cents: 150 },
    ]);
  });
});

describe("spendingByWeekday", () => {
  // 2026-10-19 is a Monday; two full weeks.
  const period = { start: "2026-10-19", end: "2026-11-01" };

  it("starts the week on Monday", () => {
    expect(spendingByWeekday([], period).map((day) => day.label)).toEqual([
      "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
    ]);
  });

  it("averages over how many of each weekday the period has", () => {
    const days = spendingByWeekday(
      [tx("expense", 400, "2026-10-24"), tx("expense", 200, "2026-10-31"), tx("income", 999, "2026-10-24")],
      period,
    );
    expect(days.find((day) => day.label === "Sat")).toMatchObject({ totalCents: 600, averageCents: 300 });
    expect(days.find((day) => day.label === "Mon")).toMatchObject({ totalCents: 0, averageCents: 0 });
  });
});

describe("largestExpenses", () => {
  it("returns the biggest expenses only", () => {
    const largest = largestExpenses(
      [tx("expense", 5, "2026-10-01"), tx("income", 999, "2026-10-01"), tx("expense", 50, "2026-10-02"), tx("expense", 20, "2026-10-03")],
      2,
    );
    expect(largest.map((transaction) => transaction.amountCents)).toEqual([50, 20]);
  });
});

describe("buildInsights", () => {
  const months = ["2026-09", "2026-10"];
  const current = [
    tx("income", 50_000_00, "2026-09-01", salary),
    tx("expense", 10_000_00, "2026-09-05", rent),
    tx("expense", 2_000_00, "2026-09-12", food),
    tx("expense", 6_000_00, "2026-10-17", { ...food, note: "Anniversary dinner" }),
  ];
  const previous = [tx("income", 40_000_00, "2026-07-01", salary), tx("expense", 10_000_00, "2026-07-05", rent)];
  const insights = buildInsights({
    currency: "PHP",
    current: periodTotals(current),
    previous: periodTotals(previous),
    months: monthlyReport(current, months),
    trends: categoryTrends(current, previous, months),
    weekdays: spendingByWeekday(current, { start: "2026-09-01", end: "2026-10-25" }),
    largest: largestExpenses(current, 1)[0],
  });
  const texts = insights.map((insight) => insight.text);

  it("explains a spending change and what drove it", () => {
    expect(texts[0]).toBe("Spending is up 80% on the previous period, mostly Food (+₱8,000.00).");
    expect(insights[0]?.tone).toBe("bad");
  });

  it("reports the income change and savings rate", () => {
    expect(texts).toContain("Income is up 25% on the previous period.");
    expect(texts).toContain("You kept 64% of your income (₱32,000.00).");
  });

  it("names the busiest weekday in full", () => {
    expect(texts.some((text) => /^You spend the most on (Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)days, about ₱/.test(text))).toBe(true);
  });

  it("names the largest expense by its note", () => {
    expect(texts).toContain("Your largest single expense was Rent at ₱10,000.00.");
  });

  it("says nothing about change when there was no previous period", () => {
    const quiet = buildInsights({
      currency: "PHP",
      current: periodTotals(current),
      previous: periodTotals([]),
      months: [],
      trends: [],
      weekdays: [],
      largest: undefined,
    });
    expect(quiet.map((insight) => insight.text).some((text) => text.includes("previous period"))).toBe(false);
  });

  it("flags overspending", () => {
    const over = buildInsights({
      currency: "PHP",
      current: periodTotals([tx("income", 100_00, "2026-10-01"), tx("expense", 250_00, "2026-10-02")]),
      previous: periodTotals([]),
      months: [],
      trends: [],
      weekdays: [],
      largest: undefined,
    });
    expect(over).toContainEqual({ tone: "bad", text: "You spent ₱150.00 more than you earned." });
  });
});
