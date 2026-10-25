"use client";

import { CloseButton, Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import Link from "next/link";
import { signOut } from "@/app/(app)/actions";
import { ChevronDownIcon, SettingsIcon, SignOutIcon } from "@/components/icons";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Avatar } from "./avatar";

export type AccountMenuPlacement = "sidebar" | "header";

interface AccountMenuProps {
  name: string;
  /** Shown under the name; null when the name already is the email. */
  email: string | null;
  /** The person's picture; initials stand in when null. */
  avatarUrl: string | null;
  placement: AccountMenuPlacement;
}

const itemClassName =
  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground " +
  "hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary";

const TRIGGER_LAYOUT: Record<AccountMenuPlacement, { button: string; name: string; email: string; chevron: string }> = {
  sidebar: {
    button: "w-full gap-3 rounded-2xl p-2.5",
    name: "text-sm",
    email: "text-xs",
    // Points up while closed, because the menu opens above the button.
    chevron: "rotate-180 group-data-open:rotate-0",
  },
  header: {
    button: "max-w-44 gap-2 rounded-xl py-1 pr-1.5 pl-1",
    name: "text-xs",
    email: "text-[11px]",
    chevron: "group-data-open:rotate-180",
  },
};

/** The avatar with the name and, in small text below it, the email. */
function AccountTrigger({ name, email, avatarUrl, placement }: AccountMenuProps) {
  const layout = TRIGGER_LAYOUT[placement];
  return (
    <PopoverButton
      className={`group flex items-center text-left transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary data-open:bg-surface-sunken ${layout.button}`}
    >
      <Avatar name={name} imageUrl={avatarUrl} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${layout.name}`}>{name}</span>
        {email && <span className={`block truncate text-muted ${layout.email}`}>{email}</span>}
      </span>
      <ChevronDownIcon
        width={16}
        height={16}
        className={`shrink-0 text-muted transition-transform ${layout.chevron}`}
      />
    </PopoverButton>
  );
}

/**
 * The person's own controls in one place: theme, settings, and signing out.
 * In the sidebar it opens upwards from the profile card; in the phone header
 * it drops down below it.
 */
export function AccountMenu({ name, email, avatarUrl, placement }: AccountMenuProps) {
  const isSidebar = placement === "sidebar";
  return (
    <Popover className={`min-w-0 ${isSidebar ? "w-full" : ""}`}>
      <AccountTrigger name={name} email={email} avatarUrl={avatarUrl} placement={placement} />
      <PopoverPanel
        transition
        anchor={isSidebar ? "top start" : "bottom end"}
        className={`z-50 flex w-64 flex-col rounded-2xl border border-border bg-surface p-1.5 text-foreground shadow-overlay transition duration-150 [--anchor-gap:8px] data-closed:opacity-0 ${
          isSidebar ? "data-closed:translate-y-1" : "data-closed:-translate-y-1"
        }`}
      >
        <div className="px-2.5 pt-2.5 pb-3">
          <p className="mb-2 text-xs font-medium text-muted">Theme</p>
          <ThemeSwitcher stretch />
        </div>
        <div className="border-t border-border pt-1.5">
          <CloseButton as={Link} href="/settings" className={itemClassName}>
            <SettingsIcon width={18} height={18} className="text-muted" />
            Settings
          </CloseButton>
          <form action={signOut}>
            <button type="submit" className={itemClassName}>
              <SignOutIcon width={18} height={18} className="text-muted" />
              Sign out
            </button>
          </form>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
