import { describe, expect, it } from "vitest";
import { accountCardColor, brandForAccount, matchBrand, PH_BRANDS } from "./brands";
import { isAccountColor } from "./colors";

describe("PH_BRANDS", () => {
  it("only contains colours the database accepts", () => {
    for (const brand of PH_BRANDS) {
      for (const swatch of brand.colors) expect(isAccountColor(swatch.hex), `${brand.id} ${swatch.hex}`).toBe(true);
    }
  });

  it("gives every brand at least one colour", () => {
    for (const brand of PH_BRANDS) expect(brand.colors.length, brand.id).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = PH_BRANDS.map((brand) => brand.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never gives two brands the same alias", () => {
    const owners = new Map<string, string>();
    for (const brand of PH_BRANDS) {
      for (const alias of brand.aliases) {
        expect(owners.get(alias), `"${alias}" is used by ${owners.get(alias)} and ${brand.id}`).toBeUndefined();
        owners.set(alias, brand.id);
      }
    }
  });
});

describe("matchBrand", () => {
  it.each([
    ["GCash", "gcash"],
    ["gcash", "gcash"],
    ["G-Cash Savings", "gcash"],
    ["My GCash wallet", "gcash"],
    ["BPI Savings", "bpi"],
    ["Bank of the Philippine Islands", "bpi"],
    ["BDO Debit", "bdo"],
    ["Banco de Oro", "bdo"],
    ["PayMaya", "maya"],
    ["Maya Savings", "maya"],
    ["GoTyme", "gotyme"],
    ["Go Tyme Bank", "gotyme"],
    ["MariBank", "maribank"],
    ["SeaBank", "maribank"],
    ["Coins.ph", "coinsph"],
    ["Komo by EastWest", "komo"],
    ["EastWest Visa", "eastwest"],
    ["Security Bank Platinum", "securitybank"],
    ["UnionBank Rewards", "unionbank"],
    ["Landbank Payroll", "landbank"],
    ["Shopee Pay", "shopeepay"],
    ["GrabPay", "grabpay"],
  ])("finds %j as %s", (name, id) => {
    expect(matchBrand(name)?.id).toBe(id);
  });

  it.each([
    "",
    "Cash on hand",
    "Emergency fund",
    "Kabpia",
    "Abdominal savings",
    "Wisely spent",
    "Unionized",
    "Tonikko",
  ])("finds nothing in %j", (name) => {
    expect(matchBrand(name)).toBeNull();
  });

  it("prefers the longer, more specific alias", () => {
    // "eastwest" (EastWest Bank) and "komo by eastwest" (Komo) both match.
    expect(matchBrand("Komo by EastWest")?.id).toBe("komo");
  });
});

describe("accountCardColor", () => {
  it("uses a saved colour even when the name matches a brand", () => {
    expect(accountCardColor({ name: "GCash", institution: null, type: "e_wallet", color: "#123456" })).toBe("#123456");
  });

  it("falls back to the brand colour for an account saved without one", () => {
    expect(accountCardColor({ name: "BPI Debit", institution: null, type: "debit_card", color: null })).toBe("#B11116");
  });

  it("falls back to the type default when no brand matches", () => {
    expect(accountCardColor({ name: "Wallet", institution: null, type: "cash", color: null })).toBe("#CA8A04");
  });
});

describe("brandForAccount", () => {
  it("uses the institution over the name", () => {
    expect(brandForAccount({ name: "Taiwan Trip Savings", institution: "GoTyme Bank" })?.id).toBe("gotyme");
    expect(brandForAccount({ name: "BPI payroll moved", institution: "GCash" })?.id).toBe("gcash");
  });

  it("falls back to the name when there is no institution", () => {
    expect(brandForAccount({ name: "GCash", institution: null })?.id).toBe("gcash");
  });

  it("falls back to the name when the institution isn't a known brand", () => {
    expect(brandForAccount({ name: "BPI Savings", institution: "Rakuten Bank" })?.id).toBe("bpi");
  });

  it("recognises every brand by its own display name", () => {
    for (const brand of PH_BRANDS) expect(matchBrand(brand.name)?.id, brand.name).toBe(brand.id);
  });
});
