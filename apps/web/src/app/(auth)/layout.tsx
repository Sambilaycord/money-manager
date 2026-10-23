import type { ReactNode } from "react";
import { CheckIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/alert";
import { getSupabaseEnv } from "@/lib/supabase/env";

const HIGHLIGHTS = [
  "Every account and currency, kept separate and exact",
  "Income, spending, and transfers in one timeline",
  "The same numbers on the web and on your phone",
];

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-linear-to-b from-sky to-cloud lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-(--glow) blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-cloud-fill blur-3xl"
      />
      <div className="relative">
        <Logo />
      </div>
      <div className="relative max-w-md">
        <h2 className="text-3xl font-semibold tracking-tight text-balance">
          Calm, clear control over your money.
        </h2>
        <ul className="mt-8 flex flex-col gap-4">
          {HIGHLIGHTS.map((highlight) => (
            <li key={highlight} className="flex items-start gap-3 text-sm text-foreground/80">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface/80 text-cloud-ink">
                <CheckIcon width={12} height={12} strokeWidth={2.5} />
              </span>
              {highlight}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs text-foreground/60">Private by default. Only you can see your data.</p>
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const isConfigured = getSupabaseEnv() !== null;

  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <BrandPanel />
      <div className="flex flex-col items-center justify-center gap-8 px-4 py-12 sm:px-6">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {!isConfigured && (
            <div className="mb-6">
              <Alert tone="info">
                Supabase isn&apos;t connected yet. Add the project URL and anon key to{" "}
                <code className="font-mono">apps/web/.env.local</code> to enable sign-in.
              </Alert>
            </div>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}
