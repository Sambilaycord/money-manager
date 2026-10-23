import { describe, expect, it } from "vitest";
import { ACCOUNT_TYPES } from "./accounts";
import { PH_BRANDS } from "./brands";
import {
  ACCOUNT_COLOR_PALETTE,
  accountColorOrDefault,
  isAccountColor,
  readableTextColor,
} from "./colors";

describe("isAccountColor", () => {
  it.each(["#000000", "#FFFFFF", "#0F766E"])("accepts %s", (hex) => {
    expect(isAccountColor(hex)).toBe(true);
  });

  it.each(["#fff", "#ffffff", "0F766E", "#0F766", "#0F766EE", "#GGGGGG", "red", "", " #0F766E"])(
    "rejects %j",
    (value) => {
      expect(isAccountColor(value)).toBe(false);
    },
  );
});

describe("palette and defaults", () => {
  it("only contains colours the database accepts", () => {
    for (const swatch of ACCOUNT_COLOR_PALETTE) expect(isAccountColor(swatch.hex)).toBe(true);
  });

  it("has no duplicate colours", () => {
    const hexes = ACCOUNT_COLOR_PALETTE.map((swatch) => swatch.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it.each(ACCOUNT_TYPES)("gives %s a valid default", (type) => {
    expect(isAccountColor(accountColorOrDefault(null, type))).toBe(true);
  });

  it("keeps a chosen colour over the default", () => {
    expect(accountColorOrDefault("#123456", "bank")).toBe("#123456");
  });
});

describe("readableTextColor", () => {
  it.each([
    ["#000000", "#FFFFFF"],
    ["#1E3A8A", "#FFFFFF"],
    ["#FFFFFF", "#111111"],
    ["#FFD400", "#111111"],
    // Mid-tones where brands use white even though black contrasts slightly more.
    ["#007CFF", "#FFFFFF"],
    ["#EA5F00", "#FFFFFF"],
    // Bright colours where white would be unreadable.
    ["#2FF29E", "#111111"],
    ["#00B14F", "#111111"],
    ["#FCB813", "#111111"],
  ])("puts readable text on %s", (background, expected) => {
    expect(readableTextColor(background)).toBe(expected);
  });

  it("meets WCAG AA for large text (3:1) on every palette and brand colour", () => {
    const luminance = (hex: string) => {
      const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const brandSwatches = PH_BRANDS.flatMap((brand) => brand.colors);
    for (const { hex } of [...ACCOUNT_COLOR_PALETTE, ...brandSwatches]) {
      const background = luminance(hex);
      const text = luminance(readableTextColor(hex));
      const ratio = (Math.max(background, text) + 0.05) / (Math.min(background, text) + 0.05);
      expect(ratio).toBeGreaterThanOrEqual(3);
    }
  });
});
