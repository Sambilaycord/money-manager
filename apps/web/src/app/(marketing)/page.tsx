import { APP_NAME, APP_TAGLINE } from "@money-manager/shared";
import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BudgetsIcon,
  ReportsIcon,
  SyncIcon,
  TransactionsIcon,
} from "@/components/icons";
import { toneClassName, type PastelTone } from "@/components/tone";
import { buttonClassName } from "@/components/ui/button";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Structured data so search engines can show Opis as a free finance app.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL.toString(),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, iOS, Android",
  offers: { "@type": "Offer", price: "0", priceCurrency: "PHP" },
};

interface Feature {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: PastelTone;
  title: string;
  description: string;
}

const FEATURES: readonly Feature[] = [
  {
    icon: TransactionsIcon,
    tone: "sky",
    title: "Track every peso and dollar",
    description: "Record income, expenses, and transfers across all your accounts and currencies.",
  },
  {
    icon: BudgetsIcon,
    tone: "butter",
    title: "Budgets that keep you honest",
    description: "Set monthly limits per category and see what's left before you overspend.",
  },
  {
    icon: ReportsIcon,
    tone: "rose",
    title: "See where it goes",
    description: "Spending by category and month-over-month trends, without a spreadsheet.",
  },
  {
    icon: SyncIcon,
    tone: "mint",
    title: "Web and mobile, in sync",
    description: "One account on the website and the phone app, so your numbers always match.",
  },
];

// Illustrative figures for the product preview only; nothing here is real data.
const PREVIEW_ROWS = [
  { title: "Salary", detail: "BPI Savings", amount: "+₱45,000.00", direction: "in" },
  { title: "Groceries", detail: "GCash", amount: "−₱2,184.50", direction: "out" },
  { title: "Eating out", detail: "Cash", amount: "−₱640.00", direction: "out" },
] as const;

const PREVIEW_BARS = [
  { label: "Groceries", width: "100%" },
  { label: "Transport", width: "62%" },
  { label: "Eating out", width: "41%" },
];

/** A static picture of the dashboard; hidden from assistive tech since it is decoration. */
function ProductPreview() {
  return (
    <div aria-hidden="true" className="relative">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-linear-to-br from-sky via-cloud to-sky opacity-80 blur-2xl" />
      <div className="relative rounded-3xl border border-border bg-surface p-5 shadow-overlay sm:p-6">
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-2xl p-4 ${toneClassName.mint}`}>
            <p className="text-xs font-medium">Income this month</p>
            <p className="mt-2 text-lg font-semibold tracking-tight tabular-nums">₱45,000</p>
          </div>
          <div className={`rounded-2xl p-4 ${toneClassName.rose}`}>
            <p className="text-xs font-medium">Spent this month</p>
            <p className="mt-2 text-lg font-semibold tracking-tight tabular-nums">₱18,420</p>
          </div>
        </div>
        <ul className="mt-5 divide-y divide-border">
          {PREVIEW_ROWS.map((row) => (
            <li key={row.title} className="flex items-center gap-3 py-2.5">
              <span
                className={`flex size-8 items-center justify-center rounded-lg ${
                  row.direction === "in" ? toneClassName.mint : toneClassName.rose
                }`}
              >
                {row.direction === "in" ? (
                  <ArrowDownLeftIcon width={14} height={14} />
                ) : (
                  <ArrowUpRightIcon width={14} height={14} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{row.title}</span>
                <span className="block text-xs text-muted">{row.detail}</span>
              </span>
              <span
                className={`text-sm font-medium tabular-nums ${row.direction === "in" ? "text-income" : ""}`}
              >
                {row.amount}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl bg-surface-sunken p-4">
          <p className="mb-3 text-xs font-medium text-muted">Where it went</p>
          <div className="flex flex-col gap-2.5">
            {PREVIEW_BARS.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 text-muted">{bar.label}</span>
                <span className="h-2 flex-1 rounded-full bg-surface">
                  <span style={{ width: bar.width }} className="block h-full rounded-full bg-chart-expense" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Escaped so no value could close the script tag early.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-(--glow) blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted shadow-xs">
              <span className="size-1.5 rounded-full bg-mint-ink" />
              Web and mobile, one account
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {APP_TAGLINE}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted">
              {APP_NAME}, named for the Roman goddess of plenty, keeps your accounts, spending,
              budgets, and savings in one calm place, on your computer and your phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClassName("primary", "h-11 px-5")}>
                Create a free account
                <ArrowRightIcon width={16} height={16} />
              </Link>
              <Link href="/login" className={buttonClassName("secondary", "h-11 px-5")}>
                Sign in
              </Link>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section aria-labelledby="features-heading" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 id="features-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mt-3 text-muted">
              Built for everyday money: a few accounts, a couple of currencies, and a clear picture
              at the end of each month.
            </p>
          </div>
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, tone, title, description }) => (
              <li key={title} className="rounded-2xl border border-border bg-background p-6">
                <span className={`flex size-11 items-center justify-center rounded-xl ${toneClassName[tone]}`}>
                  <Icon />
                </span>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-linear-to-br from-sky via-cloud to-butter p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Start with one account.</h2>
            <p className="mt-2 text-foreground/75">
              It takes a minute, and your dashboard fills in as you go.
            </p>
          </div>
          <Link href="/signup" className={buttonClassName("primary", "h-11 px-5")}>
            Get started
            <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
