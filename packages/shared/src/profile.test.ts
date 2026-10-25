import { describe, expect, it } from "vitest";
import { FULL_NAME_MAX_LENGTH } from "./auth";
import { detectImageType, validateProfileInput } from "./profile";

describe("validateProfileInput", () => {
  it("tidies the name and normalises the currency", () => {
    expect(validateProfileInput({ fullName: "  Maria   Santos ", defaultCurrency: "php" })).toEqual({
      ok: true,
      profile: { fullName: "Maria Santos", defaultCurrency: "PHP" },
    });
  });

  it("treats a blank name as none", () => {
    const result = validateProfileInput({ fullName: "   ", defaultCurrency: "PHP" });
    expect(result.ok && result.profile.fullName).toBeNull();
  });

  it("limits the name length", () => {
    const result = validateProfileInput({
      fullName: "a".repeat(FULL_NAME_MAX_LENGTH + 1),
      defaultCurrency: "PHP",
    });
    expect(result.ok).toBe(false);
  });

  it("holds the name to the same rules as sign-up", () => {
    expect(validateProfileInput({ fullName: "Ana2", defaultCurrency: "PHP" }).ok).toBe(false);
  });

  it("rejects an unknown currency", () => {
    expect(validateProfileInput({ fullName: "", defaultCurrency: "ZZZ" })).toEqual({
      ok: false,
      error: "Choose a currency from the list.",
    });
  });
});

describe("detectImageType", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);

  it("recognises JPEG, PNG, and WebP by their first bytes", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(
      detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)),
    ).toBe("image/webp");
  });

  it("rejects anything else, whatever it claims to be", () => {
    expect(detectImageType(bytes(0x3c, 0x73, 0x76, 0x67))).toBeNull();
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45))).toBeNull();
    expect(detectImageType(bytes())).toBeNull();
  });
});
