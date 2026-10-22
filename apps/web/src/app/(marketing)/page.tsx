import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { BudgetsIcon, ReportsIcon, SyncIcon, TransactionsIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/button";

interface Feature {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

const FEATURES: readonly Feature[] = [
  {
    icon: TransactionsIcon,
    title: "Track every peso and dollar",
    description: "Record income, expenses, and transfers across all your accounts and currencies.",
  },
  {
    icon: BudgetsIcon,
    title: "Budgets that keep you honest",
    description: "Set monthly limits per category and see what's left before you overspend.",
  },
  {
    icon: ReportsIcon,
    title: "See where it goes",
    description: "Spending by category and month-over-month trends, without a spreadsheet.",
  },
  {
    icon: SyncIcon,
    title: "Web and mobile, in sync",
    description: "One account on the website and the phone app, so your numbers always match.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Know where your money goes.
          </h1>
          <p className="mt-4 text-lg text-muted text-pretty">
            A simple money manager for tracking spending, income, and budgets, on your
            computer and your phone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClassName("primary", "px-5 py-2.5")}>
              Create a free account
            </Link>
            <Link href="/login" className={buttonClassName("secondary", "px-5 py-2.5")}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
