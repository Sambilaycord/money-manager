import { describe, expect, it } from "vitest";
import { validateSetAside } from "./set-asides";

const ACCOUNT = "0b6f7c1e-3a52-4d8e-9f10-2c3d4e5f6a7b";
const account = { availableCents: 50_000, currency: "USD" };

describe("validateSetAside", () => {
  it("accepts an amount up to what's free in the account", () => {
    expect(validateSetAside({ accountId: ACCOUNT, amount: "500" }, account)).toEqual({
      ok: true,
      setAside: { accountId: ACCOUNT, amountCents: 50_000 },
    });
  });

  it("refuses more than is free, or a missing account", () => {
    expect(validateSetAside({ accountId: ACCOUNT, amount: "500.01" }, account)).toEqual({
      ok: false,
      error: "Only $500.00 is free in that account.",
    });
    expect(validateSetAside({ accountId: ACCOUNT, amount: "1" }, { availableCents: 0, currency: "USD" })).toEqual({
      ok: false,
      error: "That account has nothing free to set aside.",
    });
    expect(validateSetAside({ accountId: "", amount: "1" }, null)).toMatchObject({ ok: false });
  });
});
