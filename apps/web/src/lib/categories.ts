import "server-only";
import { findCategoryByName, normalizeCategoryName, type CategoryType } from "@money-manager/shared";
import { createClient } from "@/lib/supabase/server";

// Postgres's unique_violation: one category name per type, ignoring case.
const UNIQUE_VIOLATION = "23505";

/**
 * The id of the person's `type` category called `name`, creating it when
 * there isn't one. An archived match is brought back rather than duplicated,
 * since the unique index counts archived names too.
 */
export async function findOrCreateCategory(type: CategoryType, name: string): Promise<string> {
  const supabase = await createClient();
  const findExisting = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, is_archived")
      .eq("type", type);
    if (error) throw error;
    return findCategoryByName(data, name);
  };

  const existing = await findExisting();
  if (existing) {
    if (existing.is_archived) {
      const { error } = await supabase
        .from("categories")
        .update({ is_archived: false })
        .eq("id", existing.id);
      if (error) throw error;
    }
    return existing.id;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: normalizeCategoryName(name), type })
    .select("id")
    .single();
  // Another tab or the mobile app may have just created the same name.
  if (error?.code === UNIQUE_VIOLATION) {
    const created = await findExisting();
    if (created) return created.id;
  }
  if (error) throw error;
  return data.id;
}
