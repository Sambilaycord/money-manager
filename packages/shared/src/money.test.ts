import { describe, expect, it } from "vitest";
import {
  centsToAmountInput,
  formatMoneyCompact,
  isCurrencyCode,
  MAX_AMOUNT_CENTS,
  parseAmountToCents,
} from "./money";

const cents = (value: number) => ({ ok: true, cents: value });
const invalid = { ok: false, reason: "invalid" };
const tooLarge = { ok: false, reason: "too_large" };

describe("parseAmountToCents", () => {
  it.each([
    ["0", 0],
    ["5", 500],
    ["1250.50", 125050],
    ["1250.5", 125050],
    ["0.01", 1],
    [".5", 50],
    ["5.", 500],
    ["007", 700],
  ])("parses %j as %i cents", (input, expected) => {
    expect(parseAmountToCents(input)).toEqual(cents(expected));
  });

  it.each([
    ["1,250.50", 125050],
    ["1,000,000", 100000000],
    ["1 000 000", 100000000],
    ["  42  ", 4200],
    ["\t42\n", 4200],
  ])("accepts digit grouping and padding in %j", (input, expected) => {
    expect(parseAmountToCents(input)).toEqual(cents(expected));
  });

  it("is exact where floating-point maths is not", () => {
    // parseFloat("0.29") * 100 === 28.999999999999996
    expect(parseAmountToCents("0.29")).toEqual(cents(29));
    expect(parseAmountToCents("1.005")).toEqual(invalid);
  });

  it.each([
    "",
    " ",
    ".",
    ",",
    "-5",
    "+5",
    "5-",
    "abc",
    "12abc",
    "1e5",
    "0x10",
    "1.234",
    "1.2.3",
    "₱100",
    "$5",
    "Infinity",
    "NaN",
    "５",
  ])("rejects %j as invalid", (input) => {
    expect(parseAmountToCents(input)).toEqual(invalid);
  });

  it("accepts the largest storable amount", () => {
    expect(parseAmountToCents("999,999,999,999.99")).toEqual(cents(MAX_AMOUNT_CENTS));
  });

  it.each([
    "1000000000000",
    "999999999999999999999",
    "99999999999999999999999999999999999999.99",
  ])("rejects %j as too large", (input) => {
    expect(parseAmountToCents(input)).toEqual(tooLarge);
  });

  it("ignores leading zeros when checking the size", () => {
    expect(parseAmountToCents("0000000000000001")).toEqual(cents(100));
  });
});

describe("centsToAmountInput", () => {
  it.each([
    [0, "0.00"],
    [5, "0.05"],
    [50, "0.50"],
    [125050, "1250.50"],
    [-250000, "-2500.00"],
    [MAX_AMOUNT_CENTS, "999999999999.99"],
  ])("formats %i as %j", (value, expected) => {
    expect(centsToAmountInput(value)).toBe(expected);
  });

  it.each([0, 1, 29, 125050, 99_999_999_999_999])("round-trips %i through parseAmountToCents", (value) => {
    expect(parseAmountToCents(centsToAmountInput(value))).toEqual(cents(value));
  });
});

describe("isCurrencyCode", () => {
  it.each(["PHP", "USD", "EUR", "JPY"])("accepts %s", (code) => {
    expect(isCurrencyCode(code)).toBe(true);
  });

  it.each(["php", "XYZ", "ABC", "PH", "PHPP", "", " PHP", "P1P"])("rejects %j", (code) => {
    expect(isCurrencyCode(code)).toBe(false);
  });
});

describe("formatMoneyCompact", () => {
  it("abbreviates large amounts", () => {
    expect(formatMoneyCompact(1_250_000_00, "USD", "en-US")).toBe("$1.3M");
    expect(formatMoneyCompact(12_000_00, "USD", "en-US")).toBe("$12K");
  });
});
