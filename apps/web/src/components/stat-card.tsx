import type { ComponentType, ReactNode, SVGProps } from "react";
import { toneClassName, type PastelTone } from "@/components/tone";

interface StatCardProps {
  label: string;
  /**
   * One formatted figure per currency, e.g. from `formatMoney`; the first is
   * shown large. Empty while there is nothing to total.
   */
  values: readonly string[];
  tone: PastelTone;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Optional small chart beside the figures, such as a CashFlowTrend. */
  trend?: ReactNode;
}

/** A compact single-row tile: icon, label over figure, and an optional trend on the right. */
export function StatCard({ label, values, tone, icon: Icon, trend }: StatCardProps) {
  const [headline, ...others] = values;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${toneClassName[tone]}`}
      >
        <Icon width={16} height={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="truncate text-lg font-semibold tracking-tight">
          {headline ?? <span className="text-muted">—</span>}
        </p>
        {others.length > 0 && (
          <p className="truncate text-xs text-muted tabular-nums">{others.join(" · ")}</p>
        )}
      </div>
      {trend && <div className="w-24 shrink-0">{trend}</div>}
    </div>
  );
}
