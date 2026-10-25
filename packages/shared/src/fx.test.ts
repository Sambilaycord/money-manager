import { describe, expect, it } from "vitest";
import {
  baseValueOf,
  convertBetween,
  convertItems,
  convertToBase,
  mergeConversions,
  parseExchangeRates,
  type ExchangeRates,
} from "./fx";

// 1 PHP buys 0.016 USD and 2.5 JPY, so 1 USD = 62.5 PHP and 1 JPY = 0.4 PHP.
const rates: ExchangeRates = {
  base: "PHP",
  rates: { PHP: 1, USD: 0.016, JPY: 2.5 },
  updatedAt: "2026-10-24T00:00:00.000Z",
};

describe("convertToBase", () => {
  it("leaves the base currency untouched", () => {
    expect(convertToBase(12345, "PHP", rates)).toBe(12345);
  });

  it("converts into the base currency", () => {
    expect(convertToBase(100_00, "USD", rates)).toBe(6250_00);
    expect(convertToBase(1000_00, "JPY", rates)).toBe(400_00);
  });

  it("rounds to whole cents", () => {
    expect(Number.isInteger(convertToBase(1, "USD", rates))).toBe(true);
    expect(convertToBase(1, "USD", rates)).toBe(63);
  });

  it("keeps the sign of debts", () => {
    expect(convertToBase(-50_00, "USD", rates)).toBe(-3125_00);
  });

  it("returns null without a rate", () => {
    expect(convertToBase(100, "EUR", rates)).toBeNull();
  });

  it("refuses unusable rates", () => {
    const broken = { ...rates, rates: { ZERO: 0, NEG: -1, NAN: Number.NaN } };
    for (const code of ["ZERO", "NEG", "NAN"]) expect(convertToBase(100, code, broken)).toBeNull();
  });
});

describe("baseValueOf", () => {
  it("gives the base value of one unit", () => {
    expect(baseValueOf("USD", rates)).toBeCloseTo(62.5);
    expect(baseValueOf("EUR", rates)).toBeNull();
  });
});

describe("convertItems", () => {
  const balances = [
    { name: "GCash", currency: "PHP", cents: 1000_00 },
    { name: "Wise USD", currency: "USD", cents: 100_00 },
    { name: "Suica", currency: "JPY", cents: 1000_00 },
    { name: "Euro cash", currency: "EUR", cents: 50_00 },
  ];
  const convert = (item: (typeof balances)[number], toTarget: (cents: number) => number) => ({
    ...item,
    cents: toTarget(item.cents),
  });

  it("re-expresses convertible items in the base currency", () => {
    const { items } = convertItems(balances, rates, convert);
    expect(items.map((item) => [item.name, item.currency, item.cents])).toEqual([
      ["GCash", "PHP", 1000_00],
      ["Wise USD", "PHP", 6250_00],
      ["Suica", "PHP", 400_00],
      ["Euro cash", "EUR", 50_00],
    ]);
  });

  it("reports what was converted and what couldn't be", () => {
    const { conversion } = convertItems(balances, rates, convert);
    expect(conversion).toEqual({ target: "PHP", convertedFrom: ["JPY", "USD"], unconverted: ["EUR"] });
  });

  it("reports no conversion when everything is already in the base currency", () => {
    const { conversion } = convertItems([balances[0]!], rates, convert);
    expect(conversion).toEqual({ target: "PHP", convertedFrom: [], unconverted: [] });
  });

  it("leaves everything as it was when rates are unavailable", () => {
    const result = convertItems(balances, null, convert);
    expect(result.items).toEqual(balances);
    expect(result.conversion).toBeNull();
  });

  it("does not change the input", () => {
    const before = structuredClone(balances);
    convertItems(balances, rates, convert);
    expect(balances).toEqual(before);
  });
});

describe("parseExchangeRates", () => {
  const payload = {
    result: "success",
    base_code: "PHP",
    time_last_update_unix: 1792800151,
    rates: { PHP: 1, USD: 0.015711, JPY: 2.465833 },
  };

  it("accepts the provider's response", () => {
    expect(parseExchangeRates(payload)).toEqual({
      base: "PHP",
      rates: { PHP: 1, USD: 0.015711, JPY: 2.465833 },
      updatedAt: new Date(1792800151 * 1000).toISOString(),
    });
  });

  it("drops individual rates that are malformed", () => {
    const parsed = parseExchangeRates({
      ...payload,
      rates: { USD: 0.0157, usd: 1, XX: 1, BAD: "1", ZERO: 0, NEG: -2, INF: Number.POSITIVE_INFINITY },
    });
    expect(parsed?.rates).toEqual({ USD: 0.0157 });
  });

  it.each([
    ["null", null],
    ["a string", "rates"],
    ["an error result", { ...payload, result: "error" }],
    ["a bad base", { ...payload, base_code: "XYZ" }],
    ["missing rates", { ...payload, rates: undefined }],
    ["a missing timestamp", { ...payload, time_last_update_unix: "yesterday" }],
  ])("rejects %s", (_, bad) => {
    expect(parseExchangeRates(bad)).toBeNull();
  });
});

describe("mergeConversions", () => {
  it("combines what each conversion did", () => {
    expect(
      mergeConversions(
        { target: "PHP", convertedFrom: ["USD"], unconverted: [] },
        null,
        { target: "PHP", convertedFrom: ["JPY", "USD"], unconverted: ["EUR"] },
      ),
    ).toEqual({ target: "PHP", convertedFrom: ["JPY", "USD"], unconverted: ["EUR"] });
  });

  it("is null when nothing was converted", () => {
    expect(mergeConversions(null, null)).toBeNull();
  });
});

describe("convertBetween", () => {
  it("converts between two non-base currencies through the base", () => {
    // 100 USD = 6,250 PHP = 15,625 JPY.
    expect(convertBetween(100_00, "USD", "JPY", rates)).toBe(15_625_00);
  });

  it("converts to and from the base", () => {
    expect(convertBetween(100_00, "USD", "PHP", rates)).toBe(6250_00);
    expect(convertBetween(6250_00, "PHP", "USD", rates)).toBe(100_00);
  });

  it("returns the same amount for the same currency", () => {
    expect(convertBetween(123_45, "JPY", "JPY", rates)).toBe(123_45);
  });

  it("returns null when either side has no rate", () => {
    expect(convertBetween(100, "EUR", "PHP", rates)).toBeNull();
    expect(convertBetween(100, "PHP", "EUR", rates)).toBeNull();
  });
});
