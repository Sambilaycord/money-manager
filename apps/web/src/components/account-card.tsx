import {
  ACCOUNT_TYPE_LABELS,
  accountCardColor,
  formatMoney,
  readableTextColor,
} from "@money-manager/shared";
import Link from "next/link";
import { displayBalance, type AccountWithBalance } from "@/lib/accounts";

type CardSize = "compact" | "large";

const sizeClass: Record<CardSize, { card: string; name: string; balance: string }> = {
  compact: { card: "aspect-[1.85] p-4", name: "text-sm", balance: "text-lg" },
  // Card-shaped on its own; beside the balance summary (md and up) it drops the
  // fixed ratio and stretches to the row's height so the two line up.
  large: { card: "aspect-[1.6] p-6 md:aspect-auto md:h-full md:min-h-52", name: "text-lg", balance: "text-3xl" },
};

interface CardFaceProps {
  account: AccountWithBalance;
  size: CardSize;
  /** For a foreign-currency account, its balance in the person's currency, e.g. "≈ ₱6,250.00". */
  approximateBalance?: string;
}

function CardFace({ account, size, approximateBalance }: CardFaceProps) {
  const background = accountCardColor(account);
  const balance = displayBalance(account);
  const classes = sizeClass[size];

  return (
    <div
      // The colour is the person's own choice (often a bank's brand colour),
      // so it is applied inline rather than from the theme.
      style={{ backgroundColor: background, color: readableTextColor(background) }}
      className={`relative flex w-full flex-col justify-between overflow-hidden rounded-2xl shadow-card ${classes.card}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/2 -right-1/4 size-full rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-2/3 -left-1/4 size-full rounded-full bg-black/5"
      />
      <div className="relative min-w-0">
        <p className={`truncate font-semibold ${classes.name}`}>{account.name}</p>
        <p className="truncate text-xs opacity-80">
          {[account.institution, ACCOUNT_TYPE_LABELS[account.type].singular].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="relative min-w-0">
        <p className="text-xs font-medium tracking-wide uppercase opacity-75">{balance.label}</p>
        <p className={`truncate font-semibold tabular-nums ${classes.balance}`}>
          {formatMoney(balance.cents, account.currency)}
        </p>
        {approximateBalance && (
          <p className="truncate text-xs tabular-nums opacity-80">{approximateBalance}</p>
        )}
        {account.setAsideCents > 0 && (
          <p className="truncate text-xs tabular-nums opacity-80">
            {formatMoney(account.setAsideCents, account.currency)} set aside
          </p>
        )}
      </div>
    </div>
  );
}

export function AccountCardLink({
  account,
  approximateBalance,
}: {
  account: AccountWithBalance;
  approximateBalance?: string;
}) {
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="block rounded-2xl transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <CardFace account={account} size="compact" approximateBalance={approximateBalance} />
    </Link>
  );
}

export function AccountCardLarge({
  account,
  approximateBalance,
}: {
  account: AccountWithBalance;
  approximateBalance?: string;
}) {
  return <CardFace account={account} size="large" approximateBalance={approximateBalance} />;
}
