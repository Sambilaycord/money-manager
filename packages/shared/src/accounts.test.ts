import { describe, expect, it } from "vitest";
import {
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_TYPES,
  INSTITUTION_MAX_LENGTH,
  accountToInput,
  validateAccountInput,
  type AccountInput,
} from "./accounts";

const valid: AccountInput = {
  name: "BPI Savings",
  institution: "",
  type: "savings",
  currency: "PHP",
  balance: "1,250.50",
  color: "",
};

function errorFor(overrides: Partial<AccountInput>): string | undefined {
  const result = validateAccountInput({ ...valid, ...overrides });
  return result.ok ? undefined : result.error;
}

describe("validateAccountInput", () => {
  it("accepts a complete account", () => {
    expect(validateAccountInput(valid)).toEqual({
      ok: true,
      account: {
        name: "BPI Savings",
        institution: null,
        type: "savings",
        currency: "PHP",
        openingBalanceCents: 125050,
        color: null,
      },
    });
  });

  it("trims the name and normalises the currency", () => {
    const result = validateAccountInput({ ...valid, name: "  GCash  ", currency: " php " });
    expect(result).toMatchObject({ ok: true, account: { name: "GCash", currency: "PHP" } });
  });

  it("starts a blank balance at zero", () => {
    expect(validateAccountInput({ ...valid, balance: "  " })).toMatchObject({
      ok: true,
      account: { openingBalanceCents: 0 },
    });
  });

  it("stores what is owed on a credit card as a negative balance", () => {
    expect(validateAccountInput({ ...valid, type: "credit_card", balance: "2500" })).toMatchObject({
      ok: true,
      account: { openingBalanceCents: -250000 },
    });
  });

  it.each(ACCOUNT_TYPES.filter((type) => type !== "credit_card"))(
    "keeps a %s balance positive",
    (type) => {
      expect(validateAccountInput({ ...valid, type, balance: "10" })).toMatchObject({
        ok: true,
        account: { openingBalanceCents: 1000 },
      });
    },
  );

  describe("name", () => {
    it.each(["", "   ", "\t\n"])("rejects the blank name %j", (name) => {
      expect(errorFor({ name })).toBe("Give the account a name.");
    });

    it("accepts a name at the length limit", () => {
      expect(errorFor({ name: "a".repeat(ACCOUNT_NAME_MAX_LENGTH) })).toBeUndefined();
    });

    it("rejects a name over the length limit", () => {
      expect(errorFor({ name: "a".repeat(ACCOUNT_NAME_MAX_LENGTH + 1) })).toMatch(/80 characters/);
    });

    it("measures the limit after trimming", () => {
      expect(errorFor({ name: `  ${"a".repeat(ACCOUNT_NAME_MAX_LENGTH)}  ` })).toBeUndefined();
    });

    it.each(["Visa • Platinum", "Ñoño's Wallet", "钱包", "💳 Card", "<script>"])(
      "accepts %j as plain text",
      (name) => {
        expect(errorFor({ name })).toBeUndefined();
      },
    );
  });

  describe("type", () => {
    it.each(["", "crypto", "Bank", "credit card", "__proto__", "toString"])(
      "rejects the unknown type %j",
      (type) => {
        expect(errorFor({ type })).toBe("Choose what kind of account this is.");
      },
    );
  });

  describe("currency", () => {
    it.each(["", "XYZ", "PH", "PESO", "₱"])("rejects %j", (currency) => {
      expect(errorFor({ currency })).toBe("Choose a currency from the list.");
    });
  });

  describe("balance", () => {
    it.each(["abc", "-5", "1.234", "1e5"])("rejects %j with the format message", (balance) => {
      expect(errorFor({ balance })).toBe("Enter the balance as a number, like 1,250.50.");
    });

    it("rejects an oversized paste with a size message, not a format one", () => {
      expect(errorFor({ balance: "999999999999999999999" })).toBe(
        "That's more than the largest balance we can store (999,999,999,999.99).",
      );
    });

    it("applies the size limit to amounts owed too", () => {
      expect(errorFor({ type: "credit_card", balance: "1000000000000" })).toMatch(/largest balance/);
    });
  });
});

describe("accountToInput", () => {
  it.each(ACCOUNT_TYPES)("round-trips a %s account through validation unchanged", (type) => {
    const account = {
      name: "Taiwan Trip Savings",
      institution: "GoTyme Bank",
      type,
      currency: "PHP",
      openingBalanceCents: type === "credit_card" ? -1234567 : 1234567,
      color: "#01F3FA",
    };
    expect(validateAccountInput(accountToInput(account))).toEqual({ ok: true, account });
  });

  it("leaves optional fields empty rather than writing null into the form", () => {
    const input = accountToInput({
      name: "Wallet",
      institution: null,
      type: "cash",
      currency: "PHP",
      openingBalanceCents: 0,
      color: null,
    });
    expect(input).toMatchObject({ institution: "", color: "", balance: "0.00" });
  });
});

describe("institution", () => {
  it("is optional", () => {
    expect(validateAccountInput({ ...valid, institution: "   " })).toMatchObject({
      ok: true,
      account: { institution: null },
    });
  });

  it("is trimmed and kept as typed, so unlisted banks work", () => {
    expect(validateAccountInput({ ...valid, institution: "  Rakuten Bank " })).toMatchObject({
      ok: true,
      account: { institution: "Rakuten Bank" },
    });
  });

  it("rejects one over the length limit", () => {
    expect(errorFor({ institution: "a".repeat(INSTITUTION_MAX_LENGTH + 1) })).toMatch(/60 characters/);
  });
});
