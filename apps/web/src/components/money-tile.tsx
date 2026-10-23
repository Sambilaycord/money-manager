import { formatMoney } from "@money-manager/shared";
import { toneClassName } from "@/components/tone";

type MoneyTone = "neutral" | "income" | "expense";

const fillClass: Record<MoneyTone, string> = {
  neutral: "bg-surface-sunken text-foreground",
  income: toneClassName.mint,
  expense: toneClassName.peach,
};

// Income and expense amounts carry an explicit sign so their direction never
// depends on colour alone; a real minus sign, not a hyphen.
const toneSign: Record<MoneyTone, string> = { neutral: "", income: "+", expense: "−" };

interface MoneyTileProps {
  label: string;
  /** Unsigned for income and expense tones; the tone supplies the sign. */
  cents: number;
  currency: string;
  tone?: MoneyTone;
}

/** A labelled amount inside a card, e.g. "Money in +₱35,500.00". */
export function MoneyTile({ label, cents, currency, tone = "neutral" }: MoneyTileProps) {
  // A zero stays neutral: "+₱0.00" in green reads as activity that didn't happen.
  const appliedTone = cents === 0 ? "neutral" : tone;
  return (
    <div className={`min-w-0 rounded-xl px-4 py-3.5 ${fillClass[appliedTone]}`}>
      <p className={`truncate text-sm ${appliedTone === "neutral" ? "text-muted" : ""}`}>{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tracking-tight tabular-nums">
        {toneSign[appliedTone]}
        {formatMoney(cents, currency)}
      </p>
    </div>
  );
}
