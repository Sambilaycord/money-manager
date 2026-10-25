import { APP_NAME, APP_TAGLINE } from "@money-manager/shared";
import Link from "next/link";
import { MARK_LEAF_LEFT, MARK_LEAF_RIGHT, MARK_STEM } from "@/lib/brand-mark";

/**
 * Opis's mark, a sprout. Drawn in the current text colour with tinted leaves,
 * so it reads on both the day and night skies. The shape lives in
 * lib/brand-mark.ts, shared with the generated icons.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-mint-ink"
    >
      <path d={MARK_STEM} strokeWidth={2.25} />
      <path
        d={MARK_LEAF_RIGHT}
        fill="currentColor"
        fillOpacity={0.55}
        strokeWidth={1.75}
      />
      <path
        d={MARK_LEAF_LEFT}
        fill="currentColor"
        fillOpacity={0.3}
        strokeWidth={1.75}
      />
    </svg>
  );
}

interface LogoProps {
  href?: string;
  /** Shows the tagline under the name, where there's room for it. */
  withTagline?: boolean;
}

export function Logo({ href = "/", withTagline = false }: LogoProps) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-2 rounded-lg whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <LogoMark size={withTagline ? 32 : 28} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        {withTagline && <span className="truncate text-[11px] text-muted">{APP_TAGLINE}</span>}
      </span>
    </Link>
  );
}
