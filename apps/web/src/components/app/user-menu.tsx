import { signOut } from "@/app/(app)/actions";
import { SignOutIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";

function initialsOf(name: string): string {
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
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
      >
        {initialsOf(displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        {user.fullName && <p className="truncate text-xs text-muted">{user.email}</p>}
      </div>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Sign out"
          title="Sign out"
          className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
        >
          <SignOutIcon />
        </button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="size-9 animate-pulse rounded-full bg-border" />
      <span className="h-4 flex-1 animate-pulse rounded bg-border" />
    </div>
  );
}
