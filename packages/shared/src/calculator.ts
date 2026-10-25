export type CalcOperator = "+" | "-" | "*" | "/";

export type CalcToken =
  | { kind: "number"; text: string }
  | { kind: "operator"; operator: CalcOperator };

export type CalcKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "."
  | CalcOperator
  | "negate"
  | "percent"
  | "backspace"
  | "clear";

export interface CalcState {
  tokens: CalcToken[];
  /** True right after "=": the next digit starts a new calculation instead of extending the result. */
  showingResult: boolean;
}

export const EMPTY_CALC_STATE: CalcState = { tokens: [], showingResult: false };

export type CalcResult =
  | { ok: true; value: number }
  | { ok: false; error: "empty" | "divide_by_zero" | "too_large" };

/**
 * Digits per number. JavaScript numbers hold about 15 significant digits
 * exactly, so longer input would be silently altered.
 */
export const MAX_CALC_DIGITS = 15;
/** Results at or past this are shown as an error rather than in e-notation. */
const MAX_CALC_RESULT = 1e15;
/** Rounds away binary noise: 0.1 + 0.2 gives 0.30000000000000004 unrounded. */
const RESULT_SIGNIFICANT_DIGITS = 12;
const RESULT_DECIMALS = 10;

const DIGITS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const OPERATORS = new Set<string>(["+", "-", "*", "/"]);

function isOperatorKey(key: CalcKey): key is CalcOperator {
  return OPERATORS.has(key);
}

function digitCount(text: string): number {
  return text.replace(/[^0-9]/g, "").length;
}

function withLastNumber(
  tokens: CalcToken[],
  update: (text: string) => string | null,
): CalcToken[] {
  const last = tokens.at(-1);
  if (last?.kind !== "number") return tokens;
  const next = update(last.text);
  if (next === null) return tokens.slice(0, -1);
  return [...tokens.slice(0, -1), { kind: "number", text: next }];
}

/** The calculator's state after one key press. Never throws: invalid presses are ignored. */
export function pressKey(state: CalcState, key: CalcKey): CalcState {
  const startsFresh = state.showingResult && (DIGITS.has(key) || key === ".");
  const tokens = startsFresh ? [] : state.tokens;
  return { tokens: nextTokens(tokens, key), showingResult: false };
}

function nextTokens(tokens: CalcToken[], key: CalcKey): CalcToken[] {
  const last = tokens.at(-1);

  if (key === "clear") return [];

  if (key === "backspace") {
    if (last?.kind === "operator") return tokens.slice(0, -1);
    return withLastNumber(tokens, (text) => {
      const shorter = text.slice(0, -1);
      return shorter === "" || shorter === "-" ? null : shorter;
    });
  }

  if (DIGITS.has(key)) {
    if (last?.kind !== "number") return [...tokens, { kind: "number", text: key }];
    if (digitCount(last.text) >= MAX_CALC_DIGITS) return tokens;
    // "0" then "5" is "5", not "05".
    if (last.text === "0" || last.text === "-0") {
      return withLastNumber(tokens, (text) => text.replace(/0$/, key));
    }
    return withLastNumber(tokens, (text) => text + key);
  }

  if (key === ".") {
    if (last?.kind !== "number") return [...tokens, { kind: "number", text: "0." }];
    if (last.text.includes(".")) return tokens;
    return withLastNumber(tokens, (text) => `${text}.`);
  }

  if (isOperatorKey(key)) {
    if (last === undefined) return tokens;
    // A second operator in a row replaces the first: "5 + ×" means "5 ×".
    if (last.kind === "operator") return [...tokens.slice(0, -1), { kind: "operator", operator: key }];
    return [...tokens, { kind: "operator", operator: key }];
  }

  if (key === "negate") {
    return withLastNumber(tokens, (text) => (text.startsWith("-") ? text.slice(1) : `-${text}`));
  }

  // percent: the current number divided by 100, as on a pocket calculator.
  return withLastNumber(tokens, (text) => {
    const value = Number(text) / 100;
    return Number.isFinite(value) ? toCalcText(value) : text;
  });
}

const PRECEDENCE: Record<CalcOperator, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

function apply(operator: CalcOperator, left: number, right: number): number {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
  }
}

/**
 * Evaluates with the usual precedence (× and ÷ before + and −). A trailing
 * operator is ignored, so "12 +" previews as 12 while the person is typing.
 */
export function evaluate(tokens: CalcToken[]): CalcResult {
  const complete = tokens.at(-1)?.kind === "operator" ? tokens.slice(0, -1) : tokens;
  if (complete.length === 0) return { ok: false, error: "empty" };

  const values: number[] = [];
  const operators: CalcOperator[] = [];
  let dividedByZero = false;

  const reduce = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (operator === undefined || right === undefined || left === undefined) return;
    if (operator === "/" && right === 0) dividedByZero = true;
    values.push(apply(operator, left, right));
  };

  for (const token of complete) {
    if (token.kind === "number") {
      values.push(Number(token.text));
      continue;
    }
    for (let top = operators.at(-1); top !== undefined; top = operators.at(-1)) {
      if (PRECEDENCE[top] < PRECEDENCE[token.operator]) break;
      reduce();
    }
    operators.push(token.operator);
  }
  while (operators.length > 0) reduce();

  if (dividedByZero) return { ok: false, error: "divide_by_zero" };
  const value = Number((values[0] ?? 0).toPrecision(RESULT_SIGNIFICANT_DIGITS));
  if (!Number.isFinite(value) || Math.abs(value) >= MAX_CALC_RESULT) {
    return { ok: false, error: "too_large" };
  }
  // Rounding can leave -0, which would display as "-0".
  return { ok: true, value: value === 0 ? 0 : value };
}

/** A result as plain digits, never e-notation: 1e-7 becomes "0.0000001". */
export function toCalcText(value: number): string {
  const fixed = value.toFixed(RESULT_DECIMALS);
  const trimmed = fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
  return trimmed === "-0" ? "0" : trimmed;
}

/** "1234567.5" as "1,234,567.5", keeping a typed trailing "." or zeros. */
export function formatCalcNumber(text: string): string {
  const negative = text.startsWith("-");
  const [whole = "", fraction] = (negative ? text.slice(1) : text).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "−" : ""}${grouped}${fraction === undefined ? "" : `.${fraction}`}`;
}

const OPERATOR_SYMBOL: Record<CalcOperator, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

/** The expression as people read it: "1,250 × 3 − 50". */
export function formatExpression(tokens: CalcToken[]): string {
  return tokens
    .map((token) => (token.kind === "number" ? formatCalcNumber(token.text) : OPERATOR_SYMBOL[token.operator]))
    .join(" ");
}

/** The state after pressing "=": the result becomes the new starting number. */
export function pressEquals(state: CalcState): CalcState {
  const result = evaluate(state.tokens);
  if (!result.ok) return state;
  return { tokens: [{ kind: "number", text: toCalcText(result.value) }], showingResult: true };
}
