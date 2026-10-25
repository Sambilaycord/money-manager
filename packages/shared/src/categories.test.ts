import { describe, expect, it } from "vitest";
import {
  CATEGORY_NAME_MAX_LENGTH,
  categoryNameProblem,
  findCategoryByName,
  normalizeCategoryName,
} from "./categories";

describe("normalizeCategoryName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeCategoryName("  Eating   out ")).toBe("Eating out");
  });
});

describe("categoryNameProblem", () => {
  it("allows empty and names up to the limit", () => {
    expect(categoryNameProblem("")).toBeNull();
    expect(categoryNameProblem("a".repeat(CATEGORY_NAME_MAX_LENGTH))).toBeNull();
  });

  it("rejects names past the limit", () => {
    expect(categoryNameProblem("a".repeat(CATEGORY_NAME_MAX_LENGTH + 1))).toMatch(/characters/);
  });
});

describe("findCategoryByName", () => {
  const categories = [{ name: "Food & groceries" }, { name: "Eating out" }];

  it("matches regardless of case and spacing", () => {
    expect(findCategoryByName(categories, "  eating OUT ")).toBe(categories[1]);
  });

  it("finds nothing for a new name", () => {
    expect(findCategoryByName(categories, "Coffee")).toBeUndefined();
  });
});
