import { formatMoney, type TransactionListItem, type TransactionType } from "@money-manager/shared";
import type { ReactNode } from "react";
import { TransactionIcon, type RowDensity } from "@/components/transaction-icon";

interface TransactionLineProps {
  type: TransactionType;
  title: string;
  detail?: string | null;
  amount: ReactNode;
  /** Compact fits more rows on screen, for long lists. */
  density?: RowDensity;
}

const textSize: Record<RowDensity, { gap: string; main: string; detail: string }> = {
  comfortable: { gap: "gap-3", main: "text-sm", detail: "text-xs" },
  compact: { gap: "gap-2.5", main: "text-[13px] leading-5", detail: "text-[11px] leading-4" },
};

/** One transaction as a row. Built from spans so it can sit inside a button. */
export function TransactionLine({
  type,
  title,
  detail,
  amount,
  density = "comfortable",
}: TransactionLineProps) {
  const size = textSize[density];
  return (
    <span className={`flex w-full min-w-0 items-center ${size.gap}`}>
      <TransactionIcon type={type} density={density} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${size.main}`}>{title}</span>
        {detail && <span className={`block truncate text-muted ${size.detail}`}>{detail}</span>}
      </span>
      <span className={`shrink-0 text-right font-medium tabular-nums ${size.main}`}>{amount}</span>
    </span>
  );
}

export function describeListItem(transaction: TransactionListItem): { title: string; detail: string } {
  const note = transaction.note ? ` · ${transaction.note}` : "";
  if (transaction.type === "transfer") {
    return {
      title: "Transfer",
      detail: `${transaction.accountName} → ${transaction.transferAccountName ?? "another account"}${note}`,
    };
  }
  return {
    title: transaction.categoryName ?? (transaction.type === "income" ? "Income" : "Expense"),
    detail: `${transaction.accountName}${note}`,
  };
}

/** Signed so direction never depends on colour alone; a real minus sign, not a hyphen. */
export function ListItemAmount({ transaction }: { transaction: TransactionListItem }) {
  const formatted = formatMoney(transaction.amountCents, transaction.currency);
  if (transaction.type === "income") return <span className="text-income">+{formatted}</span>;
  if (transaction.type === "expense") return <span>−{formatted}</span>;
  return <span className="text-muted">{formatted}</span>;
}
