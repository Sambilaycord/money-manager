import type { AccountType } from "./accounts";

export interface ColorSwatch {
  /** Uppercase #RRGGBB, the form the database CHECK constraint accepts. */
  hex: string;
  label: string;
}

// Account colours are user data painted onto cards, not part of the app's
// theme, so they are exact values rather than theme tokens.
export const ACCOUNT_COLOR_PALETTE: readonly ColorSwatch[] = [
  { hex: "#2563EB", label: "Blue" },
  { hex: "#4F46E5", label: "Indigo" },
  { hex: "#7C3AED", label: "Violet" },
  { hex: "#DB2777", label: "Pink" },
  { hex: "#DC2626", label: "Red" },
  { hex: "#EA580C", label: "Orange" },
  { hex: "#CA8A04", label: "Gold" },
  { hex: "#16A34A", label: "Green" },
  { hex: "#0F766E", label: "Teal" },
  { hex: "#475569", label: "Slate" },
];

const DEFAULT_COLOR_BY_TYPE: Record<AccountType, string> = {
  bank: "#2563EB",
  savings: "#16A34A",
  debit_card: "#4F46E5",
  credit_card: "#475569",
  e_wallet: "#0F766E",
  cash: "#CA8A04",
  investment: "#7C3AED",
  other: "#475569",
};

export function isAccountColor(value: string): boolean {
  return /^#[0-9A-F]{6}$/.test(value);
}

export function accountColorOrDefault(color: string | null, type: AccountType): string {
  return color ?? DEFAULT_COLOR_BY_TYPE[type];
}

const LIGHT_TEXT = "#FFFFFF";
const DARK_TEXT = "#111111";

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Brands like GCash, RCBC and MariBank set white text on mid-tone colours where
 * black would technically contrast more, and black text there looks off-brand.
 * So white wins whenever it clears this ratio, which is above WCAG AA's 3:1 for
 * large or bold text; card text is semibold.
 */
const MIN_LIGHT_TEXT_CONTRAST = 3.4;

/** White or near-black text for `background`, which may be any brand colour. */
export function readableTextColor(background: string): string {
  const luminance = relativeLuminance(background);
  const lightContrast = contrastRatio(luminance, relativeLuminance(LIGHT_TEXT));
  return lightContrast >= MIN_LIGHT_TEXT_CONTRAST ? LIGHT_TEXT : DARK_TEXT;
}
