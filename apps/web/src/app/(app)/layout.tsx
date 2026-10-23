import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BottomNav, BottomNavLinks } from "@/components/app/bottom-nav";
import { SidebarNav, SidebarNavLinks } from "@/components/app/sidebar-nav";
import { UserMenu, UserMenuSkeleton } from "@/components/app/user-menu";
import { SettingsIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { iconButtonClassName } from "@/components/ui/button";
import { HOME_PATH } from "@/lib/routes";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      {/* A full-height frosted surface with its own edge, so the navigation
          reads as separate from the page rather than blending into the sky. */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-surface/90 shadow-card backdrop-blur-xl lg:flex">
        <div className="flex min-w-0 flex-1 flex-col gap-8 px-3 py-6">
          <div className="px-2">
            <Logo href={HOME_PATH} />
          </div>
          <div className="flex-1">
            {/* The URL is request-time data on dynamic routes like /accounts/[id],
                so the active-item highlight waits for it inside a boundary. */}
            <Suspense fallback={<SidebarNavLinks pathname={null} />}>
              <SidebarNav />
            </Suspense>
          </div>
          <div className="flex flex-col gap-3">
            <div className="px-1">
              <ThemeSwitcher compact />
            </div>
            {/* The session is read per request, so only this part waits on it. */}
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <Logo href={HOME_PATH} />
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <Link href="/settings" aria-label="Settings" className={iconButtonClassName}>
              <SettingsIcon />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          {children}
        </main>
      </div>

      <Suspense fallback={<BottomNavLinks pathname={null} />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
