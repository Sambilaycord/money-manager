import { describe, expect, it } from "vitest";
import {
  filterTransactions,
  hasActiveFilters,
  NO_TRANSACTION_FILTERS,
  normalizeSearch,
  paginate,
  UNCATEGORISED,
  type TransactionFilters,
  type TransactionListItem,
} from "./transaction-filters";

const WALLET = "wallet";
const SAVINGS = "savings";
const GROCERIES = "groceries";

function item(overrides: Partial<TransactionListItem>): TransactionListItem {
  return {
    id: "t",
    type: "expense",
    amountCents: 125050,
    accountId: WALLET,
    transferAccountId: null,
    categoryId: GROCERIES,
    occurredOn: "2026-10-23",
    note: null,
    currency: "PHP",
    accountName: "Daily wallet",
    transferAccountName: null,
    categoryName: "Food & groceries",
    ...overrides,
  };
}

const groceries = item({ id: "groceries", note: "SM Hypermarket weekly shop" });
const salary = item({
  id: "salary",
  type: "income",
  amountCents: 5000000,
  accountId: SAVINGS,
  accountName: "BPI Savings",
  categoryId: null,
  categoryName: null,
});
const transfer = item({
  id: "transfer",
  type: "transfer",
  amountCents: 200000,
  accountId: SAVINGS,
  accountName: "BPI Savings",
  transferAccountId: WALLET,
  transferAccountName: "Daily wallet",
  categoryId: null,
  categoryName: null,
});
const all = [groceries, salary, transfer];

function ids(filters: Partial<TransactionFilters>): string[] {
  return filterTransactions(all, { ...NO_TRANSACTION_FILTERS, ...filters }).map((t) => t.id);
}

describe("filterTransactions", () => {
  it("keeps everything with no filters", () => {
    expect(ids({})).toEqual(["groceries", "salary", "transfer"]);
  });

  it("hides unticked types", () => {
    expect(ids({ hiddenTypes: ["income", "transfer"] })).toEqual(["groceries"]);
  });

  it("keeps a transfer while either of its accounts is shown", () => {
    expect(ids({ hiddenAccountIds: [SAVINGS] })).toEqual(["groceries", "transfer"]);
    expect(ids({ hiddenAccountIds: [SAVINGS, WALLET] })).toEqual([]);
  });

  it("hides categories, including uncategorised, but never transfers", () => {
    expect(ids({ hiddenCategoryIds: [GROCERIES] })).toEqual(["salary", "transfer"]);
    expect(ids({ hiddenCategoryIds: [UNCATEGORISED] })).toEqual(["groceries", "transfer"]);
  });

  it("keeps only days inside the date range, inclusive", () => {
    const dated = [
      item({ id: "early", occurredOn: "2026-10-01" }),
      item({ id: "middle", occurredOn: "2026-10-15" }),
      item({ id: "late", occurredOn: "2026-10-31" }),
    ];
    const between = (dateFrom: string | null, dateTo: string | null) =>
      filterTransactions(dated, { ...NO_TRANSACTION_FILTERS, dateFrom, dateTo }).map((t) => t.id);
    expect(between("2026-10-01", "2026-10-15")).toEqual(["early", "middle"]);
    expect(between("2026-10-15", null)).toEqual(["middle", "late"]);
    expect(between(null, "2026-10-14")).toEqual(["early"]);
  });

  it("searches notes, categories, accounts, and amounts, case-insensitively", () => {
    expect(ids({ search: "hypermarket" })).toEqual(["groceries"]);
    expect(ids({ search: "GROCERIES" })).toEqual(["groceries"]);
    expect(ids({ search: "bpi" })).toEqual(["salary", "transfer"]);
    expect(ids({ search: "1,250.50" })).toEqual(["groceries"]);
  });

  it("requires every word of the search to match", () => {
    expect(ids({ search: "wallet weekly" })).toEqual(["groceries"]);
    expect(ids({ search: "wallet salary" })).toEqual([]);
  });
});

describe("hasActiveFilters", () => {
  it("is false only when nothing is searched or hidden", () => {
    expect(hasActiveFilters(NO_TRANSACTION_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...NO_TRANSACTION_FILTERS, search: "x" })).toBe(true);
    expect(hasActiveFilters({ ...NO_TRANSACTION_FILTERS, hiddenTypes: ["income"] })).toBe(true);
    expect(hasActiveFilters({ ...NO_TRANSACTION_FILTERS, dateFrom: "2026-10-01" })).toBe(true);
  });
});

describe("normalizeSearch", () => {
  it("trims, collapses spaces, and caps the length", () => {
    expect(normalizeSearch("  weekly   shop ")).toBe("weekly shop");
    expect(normalizeSearch("a".repeat(500))).toHaveLength(100);
  });
});

describe("paginate", () => {
  const numbers = Array.from({ length: 120 }, (_, index) => index);

  it("slices the requested page", () => {
    const page = paginate(numbers, 2, 50);
    expect(page.items[0]).toBe(50);
    expect(page.items).toHaveLength(50);
    expect(page).toMatchObject({ page: 2, pageCount: 3, firstIndex: 50, total: 120 });
  });

  it("returns a short last page", () => {
    expect(paginate(numbers, 3, 50).items).toHaveLength(20);
  });

  it("clamps pages out of range or malformed", () => {
    expect(paginate(numbers, 99, 50).page).toBe(3);
    expect(paginate(numbers, 0, 50).page).toBe(1);
    expect(paginate(numbers, Number.NaN, 50).page).toBe(1);
  });

  it("has one empty page for an empty list", () => {
    expect(paginate([], 1, 50)).toEqual({ items: [], page: 1, pageCount: 1, firstIndex: 0, total: 0 });
  });
});
