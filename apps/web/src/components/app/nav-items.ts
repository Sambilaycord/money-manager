import type { ComponentType, SVGProps } from "react";
import {
  AccountsIcon,
  BudgetsIcon,
  DashboardIcon,
  ReportsIcon,
  SettingsIcon,
  TransactionsIcon,
} from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/transactions", label: "Transactions", icon: TransactionsIcon },
  { href: "/accounts", label: "Accounts", icon: AccountsIcon },
  { href: "/budgets", label: "Budgets", icon: BudgetsIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
