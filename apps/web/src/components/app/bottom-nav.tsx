"use client";

import { CloseButton, Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MoreIcon } from "@/components/icons";
import { toneClassName, type PastelTone } from "@/components/tone";
import { PHONE_MORE, PHONE_TABS, isActivePath, type NavItem } from "./nav-items";

const tabClassName =
  "flex min-w-0 flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-primary";

function TabIcon({ isActive, tone, children }: { isActive: boolean; tone: PastelTone; children: ReactNode }) {
  return (
    <span
      className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
        isActive ? toneClassName[tone] : ""
      }`}
    >
      {children}
    </span>
  );
}

function MoreTab({ items, pathname }: { items: readonly NavItem[]; pathname: string | null }) {
  const active = items.find((item) => pathname !== null && isActivePath(pathname, item.href));
  return (
    <Popover className="flex">
      <PopoverButton
        className={`${tabClassName} w-full ${active ? "text-foreground" : "text-muted"} data-open:text-foreground`}
      >
        {/* Wears the open section's colour, so it's clear where you are. */}
        <TabIcon isActive={active !== undefined} tone={active?.tone ?? "cloud"}>
          <MoreIcon width={18} height={18} />
        </TabIcon>
        More
      </PopoverButton>
      <PopoverPanel
        transition
        anchor="top end"
        className="z-50 flex w-52 flex-col rounded-2xl border border-border bg-surface p-1.5 text-foreground shadow-overlay transition duration-150 [--anchor-gap:10px] data-closed:translate-y-1 data-closed:opacity-0"
      >
        {items.map(({ href, label, icon: Icon, tone }) => {
          const isActive = pathname !== null && isActivePath(pathname, href);
          return (
            <CloseButton
              as={Link}
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl p-1.5 pr-3 text-sm font-medium hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary ${
                isActive ? "bg-primary-soft" : ""
              }`}
            >
              <span className={`flex size-8 items-center justify-center rounded-lg ${toneClassName[tone]}`}>
                <Icon width={18} height={18} />
              </span>
              {label}
            </CloseButton>
          );
        })}
      </PopoverPanel>
    </Popover>
  );
}

/** Phone-width replacement for the sidebar; Settings lives in the account menu in the top bar. */
export function BottomNav() {
  return <BottomNavLinks pathname={usePathname()} />;
}

/** With a null pathname nothing is highlighted: the fallback while the URL is unknown. */
export function BottomNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-border bg-surface/90 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
    >
      {PHONE_TABS.map(({ href, label, icon: Icon, tone }) => {
        const isActive = pathname !== null && isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`${tabClassName} ${isActive ? "text-foreground" : "text-muted"}`}
          >
            <TabIcon isActive={isActive} tone={tone}>
              <Icon width={18} height={18} />
            </TabIcon>
            {label}
          </Link>
        );
      })}
      <MoreTab items={PHONE_MORE} pathname={pathname} />
    </nav>
  );
}
