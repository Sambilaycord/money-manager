import type { ComponentType, SVGProps } from "react";
import {
  AccountsIcon,
  BudgetsIcon,
  DashboardIcon,
  GiftIcon,
  HandCoinsIcon,
  ReportsIcon,
  TransactionsIcon,
} from "@/components/icons";
import type { PastelTone } from "@/components/tone";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Each section keeps one pastel wherever it appears, so it is recognisable at a glance. */
  tone: PastelTone;
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

const DASHBOARD: NavItem = { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, tone: "cloud" };
const REPORTS: NavItem = { href: "/reports", label: "Reports", icon: ReportsIcon, tone: "cloud" };
const ACCOUNTS: NavItem = { href: "/accounts", label: "Accounts", icon: AccountsIcon, tone: "mint" };
const TRANSACTIONS: NavItem = {
  href: "/transactions",
  label: "Transactions",
  icon: TransactionsIcon,
  tone: "sky",
};
const UTANG: NavItem = { href: "/utang", label: "Utang", icon: HandCoinsIcon, tone: "peach" };
const BUDGETS: NavItem = { href: "/budgets", label: "Budgets", icon: BudgetsIcon, tone: "butter" };
const WISHLIST: NavItem = { href: "/wishlist", label: "Wishlist", icon: GiftIcon, tone: "rose" };

/**
 * The sidebar's sections: the big picture, where money is and how it moves,
 * then what the person plans to do with it.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  { label: "Overview", items: [DASHBOARD, REPORTS] },
  { label: "Money", items: [ACCOUNTS, TRANSACTIONS, UTANG] },
  { label: "Plan", items: [BUDGETS, WISHLIST] },
];

/**
 * The sections with their own phone tab, in tab order; the rest sit behind
 * "More". Seven tabs would leave each about 55px at phone width, too narrow
 * to read, so only the most used get one.
 */
export const PHONE_TABS: readonly NavItem[] = [DASHBOARD, TRANSACTIONS, ACCOUNTS, UTANG];
export const PHONE_MORE: readonly NavItem[] = NAV_GROUPS.flatMap((group) => group.items).filter(
  (item) => !PHONE_TABS.includes(item),
);

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
