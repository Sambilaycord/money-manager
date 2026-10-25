import { getProfile } from "@/lib/profile";
import { AccountMenu, type AccountMenuPlacement } from "./account-menu";

/** Reads the session on the server, then hands the details to the interactive menu. */
export async function UserMenu({ placement }: { placement: AccountMenuPlacement }) {
  const profile = await getProfile();
  return (
    <AccountMenu
      name={profile.fullName ?? profile.email}
      email={profile.fullName ? profile.email : null}
      avatarUrl={profile.avatarUrl}
      placement={placement}
    />
  );
}

export function UserMenuSkeleton({ placement }: { placement: AccountMenuPlacement }) {
  if (placement === "header") {
    return <span aria-hidden="true" className="size-9 animate-pulse rounded-xl bg-surface-sunken" />;
  }
  return (
    <div className="flex items-center gap-3 p-2.5" aria-hidden="true">
      <span className="size-9 animate-pulse rounded-xl bg-surface-sunken" />
      <span className="h-4 flex-1 animate-pulse rounded bg-surface-sunken" />
    </div>
  );
}
