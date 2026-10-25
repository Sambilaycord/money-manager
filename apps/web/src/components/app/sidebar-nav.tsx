"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toneClassName } from "@/components/tone";
import { NAV_ITEMS, SETTINGS_NAV_ITEM, isActivePath, type NavItem } from "./nav-items";

export function SidebarNav() {
  return <SidebarNavLinks pathname={usePathname()} />;
}

function SidebarLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { href, label, icon: Icon, tone } = item;
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl p-1.5 pr-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
        isActive
          ? "bg-primary-soft text-foreground"
          : "text-muted hover:bg-surface-sunken hover:text-foreground"
      }`}
    >
      <span
        className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
          isActive ? toneClassName[tone] : "group-hover:text-foreground"
        }`}
      >
        <Icon width={18} height={18} />
      </span>
      {label}
    </Link>
  );
}

/** With a null pathname nothing is highlighted: the fallback while the URL is unknown. */
export function SidebarNavLinks({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) => pathname !== null && isActivePath(pathname, href);
  return (
    <nav aria-label="Main" className="flex h-full flex-col">
      <p className="mb-2 px-3 text-xs font-medium tracking-wide text-muted uppercase">Menu</p>
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
      </div>
      <div className="mt-auto">
        <SidebarLink item={SETTINGS_NAV_ITEM} isActive={isActive(SETTINGS_NAV_ITEM.href)} />
      </div>
    </nav>
  );
}
