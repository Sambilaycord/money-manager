import { describe, expect, it } from "vitest";
import {
  EMPTY_CALC_STATE,
  MAX_CALC_DIGITS,
  evaluate,
  formatCalcNumber,
  formatExpression,
  pressEquals,
  pressKey,
  toCalcText,
  type CalcKey,
  type CalcState,
} from "./calculator";

function press(...keys: (CalcKey | "=")[]): CalcState {
  return keys.reduce(
    (state, key) => (key === "=" ? pressEquals(state) : pressKey(state, key)),
    EMPTY_CALC_STATE,
  );
}

const shown = (state: CalcState) => formatExpression(state.tokens);
const resultOf = (...keys: (CalcKey | "=")[]) => evaluate(press(...keys).tokens);

describe("arithmetic", () => {
  it.each<[(CalcKey | "=")[], number]>([
    [["1", "2", "+", "3"], 15],
    [["1", "0", "-", "4"], 6],
    [["6", "*", "7"], 42],
    [["9", "/", "4"], 2.25],
    [["2", "+", "3", "*", "4"], 14],
    [["2", "0", "-", "6", "/", "3"], 18],
    [["1", "0", "/", "4", "*", "2"], 5],
    [["8", "-", "3", "-", "2"], 3],
  ])("%j evaluates to %d", (keys, expected) => {
    expect(resultOf(...keys)).toEqual({ ok: true, value: expected });
  });

  it("rounds away floating-point noise", () => {
    expect(resultOf(".", "1", "+", ".", "2")).toEqual({ ok: true, value: 0.3 });
    expect(resultOf("1", ".", "1", "*", "3")).toEqual({ ok: true, value: 3.3 });
  });

  it("previews while an operator is pending", () => {
    expect(resultOf("1", "2", "+")).toEqual({ ok: true, value: 12 });
  });

  it("reports division by zero instead of Infinity", () => {
    expect(resultOf("5", "/", "0")).toEqual({ ok: false, error: "divide_by_zero" });
    expect(resultOf("5", "+", "1", "/", "0", "*", "2")).toEqual({ ok: false, error: "divide_by_zero" });
  });

  it("reports results too large to show exactly", () => {
    const keys = Array<CalcKey>(MAX_CALC_DIGITS).fill("9");
    expect(resultOf(...keys, "*", "9", "9")).toEqual({ ok: false, error: "too_large" });
  });

  it("reports an empty calculation", () => {
    expect(evaluate([])).toEqual({ ok: false, error: "empty" });
  });

  it("never shows negative zero", () => {
    expect(resultOf("5", "negate", "*", "0")).toEqual({ ok: true, value: 0 });
  });
});

describe("input rules", () => {
  it("replaces a leading zero", () => {
    expect(shown(press("0", "0", "5"))).toBe("5");
  });

  it("allows one decimal point per number", () => {
    expect(shown(press("1", ".", "5", ".", "2"))).toBe("1.52");
  });

  it("starts a bare decimal point at zero", () => {
    expect(shown(press(".", "5"))).toBe("0.5");
  });

  it("swaps a repeated operator instead of stacking it", () => {
    expect(shown(press("5", "+", "*", "2"))).toBe("5 × 2");
  });

  it("ignores an operator before any number", () => {
    expect(press("*").tokens).toEqual([]);
  });

  it(`stops a number at ${MAX_CALC_DIGITS} digits`, () => {
    const keys = Array<CalcKey>(MAX_CALC_DIGITS + 3).fill("9");
    expect(shown(press(...keys)).replace(/,/g, "")).toHaveLength(MAX_CALC_DIGITS);
  });

  it("negates and un-negates the current number", () => {
    expect(shown(press("4", "negate"))).toBe("−4");
    expect(shown(press("4", "negate", "negate"))).toBe("4");
    expect(resultOf("1", "0", "+", "4", "negate")).toEqual({ ok: true, value: 6 });
  });

  it("turns the current number into a percentage", () => {
    expect(shown(press("5", "0", "percent"))).toBe("0.5");
  });

  it("backspaces digits, then operators", () => {
    expect(shown(press("1", "2", "+", "3", "backspace"))).toBe("12 +");
    expect(shown(press("1", "2", "+", "backspace"))).toBe("12");
    expect(shown(press("1", "2", "backspace", "backspace"))).toBe("");
    expect(shown(press("4", "negate", "backspace"))).toBe("");
  });

  it("clears everything", () => {
    expect(press("1", "+", "2", "clear")).toEqual(EMPTY_CALC_STATE);
  });
});

describe("after equals", () => {
  it("shows the result as the new number", () => {
    expect(shown(press("2", "*", "3", "="))).toBe("6");
  });

  it("starts fresh when a digit follows", () => {
    expect(shown(press("2", "*", "3", "=", "5"))).toBe("5");
    expect(shown(press("2", "*", "3", "=", "."))).toBe("0.");
  });

  it("continues from the result when an operator follows", () => {
    expect(resultOf("2", "*", "3", "=", "+", "1")).toEqual({ ok: true, value: 7 });
  });

  it("leaves the calculation alone when it can't be evaluated", () => {
    const state = press("5", "/", "0");
    expect(pressEquals(state)).toEqual(state);
  });
});

describe("formatting", () => {
  it.each([
    ["1234567.5", "1,234,567.5"],
    ["-1000", "−1,000"],
    ["12.", "12."],
    ["0.050", "0.050"],
    ["999", "999"],
  ])("formats %j as %j", (text, expected) => {
    expect(formatCalcNumber(text)).toBe(expected);
  });

  it.each([
    [0.0000001, "0.0000001"],
    [2.5, "2.5"],
    [1000, "1000"],
    [-0, "0"],
  ])("writes %d without e-notation as %j", (value, expected) => {
    expect(toCalcText(value)).toBe(expected);
  });

  it("uses real operator symbols", () => {
    expect(shown(press("1", "+", "2", "-", "3", "*", "4", "/", "5"))).toBe("1 + 2 − 3 × 4 ÷ 5");
  });
});
