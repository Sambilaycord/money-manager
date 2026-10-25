import { APP_NAME, APP_TAGLINE, formatMoney } from "@money-manager/shared";
import type { CSSProperties, ReactNode } from "react";
import { CheckIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { CLOUD_PATH } from "@/components/sky-backdrop";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { toneClassName, type PastelTone } from "@/components/tone";
import { Alert } from "@/components/ui/alert";
import { getSupabaseEnv } from "@/lib/supabase/env";

const HIGHLIGHTS = [
  "Every account and currency, kept separate and exact",
  "Income, spending, and transfers in one timeline",
  "The same numbers on the web and on your phone",
];

// Clouds sailing across the panel at different heights, sizes, and speeds;
// negative delays start each one partway across so the sky is never empty.
const SAILING_CLOUDS: { className: string; style: CSSProperties }[] = [
  { className: "top-[8%] w-56", style: { animationDelay: "-10s" } },
  { className: "top-[30%] w-80 opacity-80", style: { animationDelay: "-42s", animationDuration: "95s" } },
  { className: "top-[56%] w-40 opacity-90", style: { animationDelay: "-25s", animationDuration: "55s" } },
  { className: "bottom-[10%] w-72 opacity-70", style: { animationDelay: "-60s", animationDuration: "85s" } },
];

interface SampleCard {
  name: string;
  detail: string;
  cents: number;
  tone: PastelTone;
  /** Where it floats, and how it tilts and bobs, so the three never move in step. */
  className: string;
  style: CSSProperties;
}

const SAMPLE_CARDS: SampleCard[] = [
  {
    name: "Daily wallet",
    detail: "E-wallet",
    cents: 1248000,
    tone: "mint",
    className: "top-0 left-0 -rotate-6",
    style: { animationDelay: "0s" },
  },
  {
    name: "Taiwan trip",
    detail: "Savings",
    cents: 5820050,
    tone: "butter",
    className: "top-16 right-0 rotate-3",
    style: { animationDelay: "-2.5s", animationDuration: "8s" },
  },
];

/** A glimpse of the app: two sample accounts and a budget, drifting on the air. */
function SamplePreview() {
  return (
    <div aria-hidden="true" className="relative h-56 w-full max-w-sm select-none">
      {SAMPLE_CARDS.map((card) => (
        <div key={card.name} className={`absolute w-56 ${card.className}`}>
          <div
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/90 p-4 shadow-overlay backdrop-blur motion-safe:animate-float"
            style={card.style}
          >
            <div className="flex items-center gap-2.5">
              <span className={`size-8 rounded-xl ${toneClassName[card.tone]}`} />
              <div>
                <p className="text-sm font-semibold">{card.name}</p>
                <p className="text-xs text-muted">{card.detail}</p>
              </div>
            </div>
            <p className="text-xl font-semibold tracking-tight tabular-nums">{formatMoney(card.cents, "PHP")}</p>
          </div>
        </div>
      ))}
      <div className="absolute bottom-0 left-10 w-60">
        <div
          className="rounded-2xl border border-border bg-surface/90 p-4 shadow-overlay backdrop-blur motion-safe:animate-float"
          style={{ animationDelay: "-4s", animationDuration: "6s" }}
        >
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">Groceries</span>
            <span className="text-xs text-muted">72% used</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-primary-soft">
            <div className="h-full w-[72%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-linear-to-b from-sky to-cloud lg:flex lg:flex-col lg:items-center lg:justify-between lg:gap-10 lg:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-(--glow) blur-3xl motion-safe:animate-breathe"
      />
      {SAILING_CLOUDS.map((cloud) => (
        <svg
          key={cloud.className}
          aria-hidden="true"
          viewBox="0 0 200 90"
          className={`pointer-events-none absolute left-0 fill-cloud-fill motion-safe:animate-sail ${cloud.className}`}
          style={cloud.style}
        >
          <path d={CLOUD_PATH} />
        </svg>
      ))}
      <div className="relative self-start">
        <Logo withTagline />
      </div>
      <div className="relative flex w-full flex-col items-center gap-10">
        <SamplePreview />
        <div className="flex max-w-md flex-col items-center">
          <h2 className="text-center text-4xl font-semibold tracking-tight text-balance">
            {APP_TAGLINE}
          </h2>
          <p className="mt-3 text-center text-sm text-foreground/70">
            {APP_NAME} is named for the Roman goddess of plenty.
          </p>
          <ul className="mt-6 flex w-fit flex-col gap-3">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3 text-base text-foreground/80">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface/80 text-cloud-ink">
                  <CheckIcon width={12} height={12} strokeWidth={2.5} />
                </span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="relative text-center text-sm text-foreground/60">Private by default. Only you can see your data.</p>
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const isConfigured = getSupabaseEnv() !== null;

  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <BrandPanel />
      <div className="flex flex-col px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          {/* Kept clear of the corner, where the sky backdrop hangs its sun and moon. */}
          <div className="mr-12">
            <ThemeSwitcher compact />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-card motion-safe:animate-rise sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
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
      </div>
    </main>
  );
}
