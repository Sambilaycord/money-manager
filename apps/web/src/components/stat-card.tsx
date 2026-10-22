type StatTone = "neutral" | "income" | "expense";

const toneClass: Record<StatTone, string> = {
  neutral: "text-foreground",
  income: "text-income",
  expense: "text-expense",
};

interface StatCardProps {
  label: string;
  /** Already formatted for display, e.g. via `formatMoney`; null while there is no data. */
  value: string | null;
  tone?: StatTone;
}

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${toneClass[tone]}`}>
        {value ?? <span className="text-muted">—</span>}
      </p>
    </div>
  );
}
