import { describe, expect, it } from "vitest";
import {
  blankWishlistInput,
  compareWishlistItems,
  linkLabel,
  normalizeWishlistUrl,
  validateWishlistInput,
  validateWishlistPurchase,
  WISHLIST_NAME_MAX_LENGTH,
  wishlistProgress,
  wishlistToInput,
  wishlistTotalsByCurrency,
  type WishlistInput,
} from "./wishlist";

const valid: WishlistInput = {
  name: "  Nintendo   Switch 2 ",
  url: "shopee.ph/nintendo-switch-2",
  price: "29,990",
  currency: "php",
  priority: "high",
  wantBy: "2026-12-20",
  note: " For Christmas ",
};

function errorFor(overrides: Partial<WishlistInput>): string | undefined {
  const result = validateWishlistInput({ ...valid, ...overrides });
  return result.ok ? undefined : result.error;
}

describe("normalizeWishlistUrl", () => {
  it("adds https:// to a bare address and keeps full ones", () => {
    expect(normalizeWishlistUrl("shopee.ph/item?id=1")).toEqual({
      ok: true,
      url: "https://shopee.ph/item?id=1",
    });
    expect(normalizeWishlistUrl(" http://example.com ")).toEqual({ ok: true, url: "http://example.com/" });
    expect(normalizeWishlistUrl("")).toEqual({ ok: true, url: null });
  });

  it("refuses anything that isn't a web link", () => {
    expect(normalizeWishlistUrl("javascript:alert(1)").ok).toBe(false);
    expect(normalizeWishlistUrl("data:text/html,hi").ok).toBe(false);
    expect(normalizeWishlistUrl("ftp://files.example.com").ok).toBe(false);
    expect(normalizeWishlistUrl("https://shopee").ok).toBe(false);
    expect(normalizeWishlistUrl("not a link").ok).toBe(false);
  });
});

describe("linkLabel", () => {
  it("shows the site without www", () => {
    expect(linkLabel("https://www.lazada.com.ph/products/x")).toBe("lazada.com.ph");
  });
});

describe("validateWishlistInput", () => {
  it("accepts and normalises a complete item", () => {
    expect(validateWishlistInput(valid)).toEqual({
      ok: true,
      item: {
        name: "Nintendo Switch 2",
        url: "https://shopee.ph/nintendo-switch-2",
        priceCents: 2999000,
        currency: "PHP",
        priority: "high",
        wantBy: "2026-12-20",
        note: "For Christmas",
      },
    });
  });

  it("allows an unknown price and no link", () => {
    const result = validateWishlistInput({ ...valid, url: "", price: "", wantBy: "" });
    expect(result.ok && result.item).toMatchObject({ url: null, priceCents: null, wantBy: null });
  });

  it("rejects bad input with a readable reason", () => {
    expect(errorFor({ name: " " })).toBe("Enter what you want.");
    expect(errorFor({ name: "x".repeat(WISHLIST_NAME_MAX_LENGTH + 1) })).toMatch(/120/);
    expect(errorFor({ url: "javascript:alert(1)" })).toMatch(/web links/);
    expect(errorFor({ price: "0" })).toMatch(/empty/);
    expect(errorFor({ price: "abc" })).toMatch(/price/);
    expect(errorFor({ currency: "XX" })).toMatch(/currency/);
    expect(errorFor({ priority: "urgent" })).toMatch(/want it/);
    expect(errorFor({ wantBy: "2026-02-30" })).toMatch(/date/);
  });

  it("round-trips through wishlistToInput", () => {
    const result = validateWishlistInput(valid);
    if (!result.ok) throw new Error(result.error);
    expect(validateWishlistInput(wishlistToInput(result.item))).toEqual(result);
  });

  it("starts blank forms at medium priority", () => {
    expect(blankWishlistInput("PHP")).toMatchObject({ priority: "medium", currency: "PHP" });
  });
});

describe("wishlistProgress", () => {
  it("measures saving against the price", () => {
    expect(wishlistProgress({ priceCents: 10000, savedCents: 2500 })).toEqual({
      ratio: 0.25,
      remainingCents: 7500,
      isFullySaved: false,
    });
    expect(wishlistProgress({ priceCents: 10000, savedCents: 12000 })).toEqual({
      ratio: 1,
      remainingCents: 0,
      isFullySaved: true,
    });
  });

  it("has nothing to measure without a price", () => {
    expect(wishlistProgress({ priceCents: null, savedCents: 500 })).toEqual({
      ratio: null,
      remainingCents: null,
      isFullySaved: false,
    });
  });
});

describe("wishlistTotalsByCurrency", () => {
  it("totals per currency, never letting extra savings on one item offset another", () => {
    expect(
      wishlistTotalsByCurrency([
        { priceCents: 10000, savedCents: 12000, currency: "PHP" },
        { priceCents: 5000, savedCents: 1000, currency: "PHP" },
        { priceCents: null, savedCents: 300, currency: "PHP" },
        { priceCents: 2000, savedCents: 0, currency: "USD" },
      ]),
    ).toEqual([
      { currency: "PHP", priceCents: 15000, savedCents: 13300, neededCents: 4000 },
      { currency: "USD", priceCents: 2000, savedCents: 0, neededCents: 2000 },
    ]);
  });
});

describe("compareWishlistItems", () => {
  it("orders by priority, then want-by date (undated last), then name", () => {
    const items = [
      { name: "Bag", priority: "low" as const, wantBy: null },
      { name: "Shoes", priority: "high" as const, wantBy: null },
      { name: "Phone", priority: "high" as const, wantBy: "2026-11-01" },
      { name: "Lamp", priority: "medium" as const, wantBy: null },
      { name: "Camera", priority: "high" as const, wantBy: null },
    ];
    expect([...items].sort(compareWishlistItems).map((item) => item.name)).toEqual([
      "Phone",
      "Camera",
      "Shoes",
      "Lamp",
      "Bag",
    ]);
  });
});

describe("validateWishlistPurchase", () => {
  const ACCOUNT = "0b6f7c1e-3a52-4d8e-9f10-2c3d4e5f6a7b";

  it("accepts a purchase, with or without a category", () => {
    expect(
      validateWishlistPurchase({ accountId: ACCOUNT.toUpperCase(), amount: "29,990", boughtOn: "2026-10-24", categoryId: "" }),
    ).toEqual({
      ok: true,
      purchase: { accountId: ACCOUNT, amountCents: 2999000, boughtOn: "2026-10-24", categoryId: null },
    });
  });

  it("needs an account, an amount, and a real date", () => {
    const base = { accountId: ACCOUNT, amount: "100", boughtOn: "2026-10-24", categoryId: "" };
    expect(validateWishlistPurchase({ ...base, accountId: "" })).toMatchObject({ ok: false });
    expect(validateWishlistPurchase({ ...base, amount: "0" })).toMatchObject({ ok: false });
    expect(validateWishlistPurchase({ ...base, boughtOn: "2026-02-30" })).toMatchObject({ ok: false });
  });
});
