import type { ComponentType, SVGProps } from "react";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CreditCardIcon,
  HandCoinsIcon,
  ScaleIcon,
  TrendIcon,
  WalletIcon,
} from "@/components/icons";
import type { PastelTone } from "@/components/tone";

interface MoneyStyle {
  tone: PastelTone;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * One colour and one symbol per money meaning, used on every page so a
 * figure reads the same wherever it appears: income green, spent red, owed
 * yellow, net worth blue. Each has its own symbol shape too, so the meaning
 * never rests on colour alone. Spread into a StatCard: `{...MONEY_STYLE.spent}`.
 */
export const MONEY_STYLE = {
  income: { tone: "mint", icon: ArrowDownLeftIcon },
  spent: { tone: "rose", icon: ArrowUpRightIcon },
  owed: { tone: "butter", icon: CreditCardIcon },
  netWorth: { tone: "sky", icon: ScaleIcon },
  /** Money held across accounts: positive like income, a wallet rather than an arrow. */
  held: { tone: "mint", icon: WalletIcon },
  /** Income minus spending over a period: blue like net worth, a trend line rather than a scale. */
  netFlow: { tone: "sky", icon: TrendIcon },
  /** Utang someone still owes the person. */
  owedToYou: { tone: "mint", icon: HandCoinsIcon },
  /** Utang the person still owes someone; peach, apart from card debt's yellow. */
  youOwe: { tone: "peach", icon: HandCoinsIcon },
} as const satisfies Record<string, MoneyStyle>;
