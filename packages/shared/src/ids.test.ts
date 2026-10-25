import { describe, expect, it } from "vitest";
import { isUuid } from "./ids";

describe("isUuid", () => {
  it("accepts uuids in either case", () => {
    expect(isUuid("0b6f7c1e-3a52-4d8e-9f10-2c3d4e5f6a7b")).toBe(true);
    expect(isUuid("0B6F7C1E-3A52-4D8E-9F10-2C3D4E5F6A7B")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("0b6f7c1e3a524d8e9f102c3d4e5f6a7b")).toBe(false);
    expect(isUuid("0b6f7c1e-3a52-4d8e-9f10-2c3d4e5f6a7b' or 1=1")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
