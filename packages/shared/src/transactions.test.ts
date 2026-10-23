import { describe, expect, it } from "vitest";
import {
  TRANSACTION_NOTE_MAX_LENGTH,
  transactionToInput,
  validateTransactionInput,
  type TransactionInput,
} from "./transactions";

const WALLET = "0b6f7c1e-3a52-4d8e-9f10-2c3d4e5f6a7b";
const SAVINGS = "1c7a8d2f-4b63-4e9f-8a21-3d4e5f6a7b8c";
const GROCERIES = "2d8b9e30-5c74-4fa0-9b32-4e5f6a7b8c9d";

const valid: TransactionInput = {
  type: "expense",
  amount: "1,250.50",
  accountId: WALLET,
  transferAccountId: "",
  categoryId: GROCERIES,
  occurredOn: "2026-10-23",
  note: "  Weekly shop ",
};

function errorFor(overrides: Partial<TransactionInput>): string | undefined {
  const result = validateTransactionInput({ ...valid, ...overrides });
  return result.ok ? undefined : result.error;
}

describe("validateTransactionInput", () => {
  it("accepts a complete expense", () => {
    expect(validateTransactionInput(valid)).toEqual({
      ok: true,
      transaction: {
        type: "expense",
        amountCents: 125050,
        accountId: WALLET,
        transferAccountId: null,
        categoryId: GROCERIES,
        occurredOn: "2026-10-23",
        note: "Weekly shop",
      },
    });
  });

  it("treats an empty category and note as none", () => {
    const result = validateTransactionInput({ ...valid, categoryId: "", note: "   " });
    expect(result.ok && result.transaction.categoryId).toBeNull();
    expect(result.ok && result.transaction.note).toBeNull();
  });

  it("drops the category from a transfer and keeps the destination", () => {
    const result = validateTransactionInput({ ...valid, type: "transfer", transferAccountId: SAVINGS });
    expect(result.ok && result.transaction).toMatchObject({
      transferAccountId: SAVINGS,
      categoryId: null,
    });
  });

  it("drops a leftover destination from a non-transfer", () => {
    const result = validateTransactionInput({ ...valid, type: "income", transferAccountId: SAVINGS });
    expect(result.ok && result.transaction.transferAccountId).toBeNull();
  });

  it("rejects an unknown type", () => {
    expect(errorFor({ type: "refund" })).toBe("Choose expense, income, or transfer.");
  });

  it("rejects missing, malformed, zero, and oversized amounts", () => {
    expect(errorFor({ amount: " " })).toBe("Enter an amount.");
    expect(errorFor({ amount: "-5" })).toBe("Enter the amount as a number, like 1,250.50.");
    expect(errorFor({ amount: "0.00" })).toBe("The amount has to be more than zero.");
    expect(errorFor({ amount: "1000000000000" })).toMatch(/largest amount/);
  });

  it("requires an account", () => {
    expect(errorFor({ accountId: "" })).toBe("Choose an account.");
    expect(errorFor({ accountId: "not-a-uuid" })).toBe("Choose an account.");
  });

  it("requires two different accounts for a transfer", () => {
    expect(errorFor({ type: "transfer", transferAccountId: "" })).toBe(
      "Choose the account the money goes to.",
    );
    expect(errorFor({ type: "transfer", transferAccountId: WALLET.toUpperCase() })).toBe(
      "A transfer needs two different accounts.",
    );
  });

  it("rejects a malformed category", () => {
    expect(errorFor({ categoryId: "groceries" })).toBe("Choose a category from the list.");
  });

  it("rejects dates that don't exist", () => {
    expect(errorFor({ occurredOn: "2026-02-30" })).toBe("Enter a valid date.");
    expect(errorFor({ occurredOn: "" })).toBe("Enter a valid date.");
  });

  it("limits the note length", () => {
    expect(errorFor({ note: "a".repeat(TRANSACTION_NOTE_MAX_LENGTH) })).toBeUndefined();
    expect(errorFor({ note: "a".repeat(TRANSACTION_NOTE_MAX_LENGTH + 1) })).toMatch(/note/);
  });
});

describe("transactionToInput", () => {
  it("round-trips through validation", () => {
    const result = validateTransactionInput(valid);
    if (!result.ok) throw new Error(result.error);
    expect(validateTransactionInput(transactionToInput(result.transaction))).toEqual(result);
  });
});
