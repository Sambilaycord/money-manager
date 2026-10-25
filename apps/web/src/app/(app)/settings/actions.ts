"use server";

import {
  AVATAR_EXTENSIONS,
  AVATAR_MAX_BYTES,
  detectImageType,
  isUuid,
  validatePasswordChange,
  validateProfileInput,
} from "@money-manager/shared";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import type { AuthFormState } from "@/lib/auth-form-state";
import { AVATAR_BUCKET } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export interface SettingsFormState {
  saved?: boolean;
  error?: string;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateProfile(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const result = validateProfileInput({
    fullName: readString(formData, "fullName"),
    defaultCurrency: readString(formData, "defaultCurrency"),
  });
  if (!result.ok) return { error: result.error };

  const { id: userId } = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: result.profile.fullName, default_currency: result.profile.defaultCurrency })
    .eq("id", userId);
  if (error) {
    console.error("Updating profile failed", error);
    return { error: "Your changes couldn't be saved. Try again." };
  }

  // The name is also kept in the sign-in metadata, which is what
  // getCurrentUser and the mobile app read; keep the two in step.
  const { error: metadataError } = await supabase.auth.updateUser({
    data: { full_name: result.profile.fullName },
  });
  if (metadataError) {
    console.error("Updating sign-in name failed", metadataError);
    return { error: "Your name was only partly saved. Try again." };
  }

  refresh();
  return { saved: true };
}

async function currentAvatarPath(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.avatar_path ?? null;
}

/** Best effort: a leftover file only wastes space, so a failure is logged, not shown. */
async function removeAvatarFile(path: string | null): Promise<void> {
  if (!path) return;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) console.error("Removing old avatar failed", error);
}

export async function uploadAvatar(formData: FormData): Promise<SettingsFormState> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a picture to upload." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "That picture is too large. Try a smaller one." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return { error: "Use a JPEG, PNG, or WebP picture." };

  const { id: userId } = await getCurrentUser();
  const previousPath = await currentAvatarPath(userId);
  // A fresh name per upload, so no browser or CDN shows a cached old picture.
  const path = `${userId}/${crypto.randomUUID()}.${AVATAR_EXTENSIONS[type]}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: type });
  if (uploadError) {
    console.error("Uploading avatar failed", uploadError);
    return { error: "The picture couldn't be uploaded. Try again." };
  }

  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (error) {
    console.error("Saving avatar failed", error);
    await removeAvatarFile(path);
    return { error: "The picture couldn't be saved. Try again." };
  }

  await removeAvatarFile(previousPath);
  refresh();
  return { saved: true };
}

export async function removeAvatar(): Promise<SettingsFormState> {
  const { id: userId } = await getCurrentUser();
  const previousPath = await currentAvatarPath(userId);
  if (!previousPath) return { saved: true };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
  if (error) {
    console.error("Removing avatar failed", error);
    return { error: "The picture couldn't be removed. Try again." };
  }

  await removeAvatarFile(previousPath);
  refresh();
  return { saved: true };
}

// Far more than anyone's list holds; a request beyond it is malformed.
const MAX_SESSIONS_PER_REQUEST = 100;

function isSessionIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_SESSIONS_PER_REQUEST &&
    value.every(isUuid)
  );
}

/**
 * Ends the sessions picked in the settings list. The ids come from the
 * client, so they are checked here, and the database function only ever
 * matches the caller's own sessions and never the one in use.
 */
export async function signOutDevices(sessionIds: unknown): Promise<SettingsFormState> {
  if (!isSessionIdList(sessionIds)) return { error: "Choose the devices to sign out." };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("sign_out_my_sessions", { session_ids: sessionIds });
  if (error) {
    console.error("Signing out devices failed", error);
    return { error: "Those devices couldn't be signed out. Try again." };
  }

  refresh();
  return { saved: true };
}

/**
 * Checks the current password by signing in with it, which also refreshes this
 * device's session, then sets the new one and ends every other session.
 */
export async function changePassword(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = validatePasswordChange({
    currentPassword: readString(formData, "currentPassword"),
    password: readString(formData, "password"),
    confirmPassword: readString(formData, "confirmPassword"),
  });
  if (!result.ok) return { fieldErrors: result.fieldErrors };

  const { email } = await getCurrentUser();
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: result.value.currentPassword,
  });
  if (verifyError?.code === "invalid_credentials") {
    return { fieldErrors: { currentPassword: "That isn't your current password." } };
  }
  if (verifyError?.status === 429) return { error: "Too many attempts. Wait a minute, then try again." };
  if (verifyError) {
    console.error("Verifying current password failed", verifyError);
    return { error: "Your password couldn't be changed. Try again." };
  }

  const { error } = await supabase.auth.updateUser({ password: result.value.password });
  if (error?.code === "weak_password") return { fieldErrors: { password: error.message } };
  if (error) {
    console.error("Changing password failed", error);
    return { error: "Your password couldn't be changed. Try again." };
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) console.error("Signing out other devices after a password change failed", signOutError);

  refresh();
  return { message: "Password changed. Your other devices have been signed out." };
}
