import { nameProblem, normalizeName } from "./auth";
import { isCurrencyCode } from "./money";

/** What the profile form sends, before any of it is trusted. */
export interface ProfileInput {
  fullName: string;
  defaultCurrency: string;
}

export interface ValidProfile {
  /** Null when left blank; the app then shows the email instead. */
  fullName: string | null;
  defaultCurrency: string;
}

export type ProfileInputResult = { ok: true; profile: ValidProfile } | { ok: false; error: string };

export function validateProfileInput(input: ProfileInput): ProfileInputResult {
  const fullName = normalizeName(input.fullName);
  const defaultCurrency = input.defaultCurrency.trim().toUpperCase();

  // Blank is allowed here: the app falls back to the email.
  const problem = fullName ? nameProblem(fullName) : null;
  if (problem) return { ok: false, error: problem };
  if (!isCurrencyCode(defaultCurrency)) {
    return { ok: false, error: "Choose a currency from the list." };
  }
  return { ok: true, profile: { fullName: fullName || null, defaultCurrency } };
}

/** Matches the avatars bucket's allowed types. */
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarType = (typeof AVATAR_TYPES)[number];

/**
 * The largest picture the server accepts. Pictures are shrunk in the browser
 * first, so this sits under the 1 MB a Server Action request may carry.
 */
export const AVATAR_MAX_BYTES = 900_000;

/** The side, in pixels, a picture is shrunk to before upload. */
export const AVATAR_SIZE = 512;

export const AVATAR_EXTENSIONS: Record<AvatarType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * What an uploaded file really is, from its first bytes. A file's declared
 * type and name come from the client and can say anything; the bytes can't.
 */
export function detectImageType(bytes: Uint8Array): AvatarType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF", four bytes of length, then "WEBP".
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}
