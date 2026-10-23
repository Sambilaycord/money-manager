import { signOut } from "@/app/(app)/actions";
import { SignOutIcon } from "@/components/icons";
import { iconButtonClassName } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function UserMenu() {
  const user = await getCurrentUser();
  const displayName = user.fullName ?? user.email;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-sunken p-2.5">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky to-cloud text-sm font-semibold text-sky-ink"
      >
        {initialsOf(displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        {user.fullName && <p className="truncate text-xs text-muted">{user.email}</p>}
      </div>
      <form action={signOut}>
        <button type="submit" aria-label="Sign out" title="Sign out" className={iconButtonClassName}>
          <SignOutIcon width={18} height={18} />
        </button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-surface-sunken p-2.5"
      aria-hidden="true"
    >
      <span className="size-9 animate-pulse rounded-xl bg-surface-sunken" />
      <span className="h-4 flex-1 animate-pulse rounded bg-surface-sunken" />
    </div>
  );
}
