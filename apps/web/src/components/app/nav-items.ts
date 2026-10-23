import type { ComponentType, SVGProps } from "react";
import {
  AccountsIcon,
  BudgetsIcon,
  DashboardIcon,
  ReportsIcon,
  SettingsIcon,
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

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, tone: "cloud" },
  { href: "/transactions", label: "Transactions", icon: TransactionsIcon, tone: "sky" },
  { href: "/accounts", label: "Accounts", icon: AccountsIcon, tone: "mint" },
  { href: "/budgets", label: "Budgets", icon: BudgetsIcon, tone: "butter" },
  { href: "/reports", label: "Reports", icon: ReportsIcon, tone: "rose" },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: SettingsIcon,
  tone: "cloud",
};

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
