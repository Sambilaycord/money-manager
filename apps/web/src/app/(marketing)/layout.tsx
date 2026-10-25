import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { buttonClassName } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Logo />
          <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
            <div className="mr-1 hidden sm:block">
              <ThemeSwitcher compact />
            </div>
            <Link href="/login" className={buttonClassName("ghost")}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonClassName("primary")}>
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-medium text-foreground">Money Manager</span>
          <span>Your accounts, spending, and trends on the web and your phone.</span>
        </div>
      </footer>
    </div>
  );
}
