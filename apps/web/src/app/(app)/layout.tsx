import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BottomNav } from "@/components/app/bottom-nav";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { UserMenu, UserMenuSkeleton } from "@/components/app/user-menu";
import { SettingsIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { HOME_PATH } from "@/lib/routes";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
        <div className="px-2 py-2">
          <Logo href={HOME_PATH} />
        </div>
        <div className="mt-6 flex-1">
          <SidebarNav />
        </div>
        <div className="border-t border-border pt-4">
          {/* The session is read per request, so only this part waits on it. */}
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <Logo href={HOME_PATH} />
          <Link
            href="/settings"
            aria-label="Settings"
            className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
          >
            <SettingsIcon />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
