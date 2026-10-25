import type { MoneyPicture } from "@money-manager/shared";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/card";

type Sign = "+" | "−" | "=";

interface LedgerLine {
  sign: Sign | null;
  label: string;
  cents: number;
  /** Where the figure comes from, so every number can be traced. */
  href?: string;
  /** Shown in the danger colour, e.g. when plans exceed the money. */
  isWarning?: boolean;
}

function Ledger({
  title,
  lines,
  total,
  currency,
  show,
}: {
  title: string;
  lines: LedgerLine[];
  total: LedgerLine;
  currency: string;
  show: (cents: number, currency: string) => ReactNode;
}) {
  const label = (line: LedgerLine) =>
    line.href ? (
      <Link
        href={line.href}
        className="rounded hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {line.label}
      </Link>
    ) : (
      line.label
    );
  return (
    <section aria-label={title} className="min-w-0">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">{title}</h3>
      <dl className="flex flex-col">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
            <dt className="flex min-w-0 items-baseline gap-2 text-muted">
              {/* The sign is part of the reading, not decoration: "− Set aside". */}
              <span className="w-3 shrink-0 text-center font-medium">{line.sign}</span>
              <span className="truncate">{label(line)}</span>
            </dt>
            <dd className="shrink-0 tabular-nums">{show(line.cents, currency)}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-2.5">
          <dt className="flex items-baseline gap-2 text-sm font-semibold">
            <span className="w-3 shrink-0 text-center">=</span>
            {total.label}
          </dt>
          <dd
            className={`shrink-0 text-lg font-semibold tracking-tight tabular-nums ${
              total.isWarning ? "text-danger" : ""
            }`}
          >
            {show(total.cents, currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

interface MoneyPictureCardProps {
  pictures: MoneyPicture[];
  /** Formats one figure; lets the page mark converted amounts as approximate. */
  show: (cents: number, currency: string) => ReactNode;
}

/**
 * How every figure connects: what's in the accounts, what's already spoken
 * for, what's free to spend, and what the person is worth once cards and
 * utang are counted. One pair of ledgers per currency.
 */
export function MoneyPictureCard({ pictures, show }: MoneyPictureCardProps) {
  return (
    <Card title="Where your money stands" description="Every figure traces back to an account.">
      <div className="flex flex-col gap-8">
        {pictures.map((picture) => (
          <div key={picture.currency} className="flex flex-col gap-2">
            {pictures.length > 1 && (
              <p className="text-xs font-semibold text-muted">In {picture.currency}</p>
            )}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <Ledger
                title="Free to spend"
                currency={picture.currency}
                show={show}
                lines={[
                  { sign: null, label: "In your accounts", cents: picture.heldCents, href: "/accounts" },
                  { sign: "−", label: "Set aside", cents: picture.setAsideCents, href: "/wishlist" },
                  {
                    sign: "−",
                    label: "Still budgeted this month",
                    cents: picture.budgetLeftCents,
                    href: "/budgets",
                  },
                ]}
                total={
                  picture.freeToSpendCents < 0
                    ? {
                        sign: "=",
                        label: "Over-planned by",
                        cents: -picture.freeToSpendCents,
                        isWarning: true,
                      }
                    : { sign: "=", label: "Free to spend", cents: picture.freeToSpendCents }
                }
              />
              <Ledger
                title="Net worth"
                currency={picture.currency}
                show={show}
                lines={[
                  { sign: null, label: "In your accounts", cents: picture.heldCents, href: "/accounts" },
                  { sign: "−", label: "Owed on cards", cents: picture.cardDebtCents, href: "/accounts" },
                  { sign: "+", label: "Owed to you", cents: picture.owedToYouCents, href: "/utang" },
                  { sign: "−", label: "You owe", cents: picture.youOweCents, href: "/utang" },
                ]}
                total={{ sign: "=", label: "Net worth", cents: picture.netWorthCents }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
