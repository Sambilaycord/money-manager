/** Matches the categories.name CHECK constraint. */
export const CATEGORY_NAME_MAX_LENGTH = 60;

/** Trims and collapses spaces, so "Eating  out " and "Eating out" are one category. */
export function normalizeCategoryName(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Why a typed category name can't be used, or null when it can. Empty means "uncategorised". */
export function categoryNameProblem(name: string): string | null {
  return normalizeCategoryName(name).length > CATEGORY_NAME_MAX_LENGTH
    ? `Keep the category to ${CATEGORY_NAME_MAX_LENGTH} characters or fewer.`
    : null;
}

/**
 * The category among `categories` that a typed name means. Case-insensitive,
 * matching the database's unique index on lower(name) per type.
 */
export function findCategoryByName<T extends { name: string }>(
  categories: readonly T[],
  name: string,
): T | undefined {
  const wanted = normalizeCategoryName(name).toLowerCase();
  return categories.find((category) => normalizeCategoryName(category.name).toLowerCase() === wanted);
}
