"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toneClassName } from "@/components/tone";
import { NAV_ITEMS, isActivePath } from "./nav-items";

/** Phone-width replacement for the sidebar; Settings lives in the top bar. */
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
      {NAV_ITEMS.map(({ href, label, icon: Icon, tone }) => {
        const isActive = pathname !== null && isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-primary ${
              isActive ? "text-foreground" : "text-muted"
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                isActive ? toneClassName[tone] : ""
              }`}
            >
              <Icon width={18} height={18} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
