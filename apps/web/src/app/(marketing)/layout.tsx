import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { buttonClassName } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <nav aria-label="Account" className="flex items-center gap-2">
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
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
          Money Manager
        </div>
      </footer>
    </div>
  );
}
