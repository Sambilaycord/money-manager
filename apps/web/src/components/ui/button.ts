type ButtonVariant = "primary" | "secondary" | "soft" | "ghost";

const base =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium whitespace-nowrap " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
  secondary: "border border-border bg-surface text-foreground shadow-xs hover:bg-surface-sunken",
  soft: "bg-primary-soft text-primary hover:bg-cloud",
  ghost: "text-muted hover:bg-surface-sunken hover:text-foreground",
};

// Shared by <button> and <Link> so both look identical.
export function buttonClassName(variant: ButtonVariant = "primary", extra = ""): string {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

/** Square and icon-only, so it always needs an aria-label. */
export const iconButtonClassName =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors " +
  "hover:bg-surface-sunken hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary";
