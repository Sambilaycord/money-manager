import type { TransactionType } from "@money-manager/shared";
import { ArrowDownLeftIcon, ArrowUpRightIcon, TransactionsIcon } from "@/components/icons";
import { toneClassName, type PastelTone } from "@/components/tone";

const appearance: Record<TransactionType, { tone: PastelTone; Icon: typeof TransactionsIcon }> = {
  income: { tone: "mint", Icon: ArrowDownLeftIcon },
  expense: { tone: "peach", Icon: ArrowUpRightIcon },
  transfer: { tone: "sky", Icon: TransactionsIcon },
};

export type RowDensity = "comfortable" | "compact";

const badgeSize: Record<RowDensity, { className: string; icon: number }> = {
  comfortable: { className: "size-9 rounded-xl", icon: 16 },
  compact: { className: "size-7 rounded-lg", icon: 14 },
};

/** A pastel badge marking a row's direction; decorative, since the amount's sign says it too. */
export function TransactionIcon({
  type,
  density = "comfortable",
}: {
  type: TransactionType;
  density?: RowDensity;
}) {
  const { tone, Icon } = appearance[type];
  const size = badgeSize[density];
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${size.className} ${toneClassName[tone]}`}
    >
      <Icon width={size.icon} height={size.icon} />
    </span>
  );
}
