import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { AccountsIcon, BudgetsIcon, TransactionsIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Your money at a glance for this month." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total balance" value={null} />
        <StatCard label="Income this month" value={null} tone="income" />
        <StatCard label="Spent this month" value={null} tone="expense" />
        <StatCard label="Net this month" value={null} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Recent transactions" className="lg:col-span-2">
          <EmptyState
            icon={TransactionsIcon}
            title="No transactions yet"
            description="Income and expenses you record on the web or the mobile app will show up here."
          />
        </Card>
        <Card title="Budgets">
          <EmptyState
            icon={BudgetsIcon}
            title="No budgets yet"
            description="Set monthly limits per category to see how much you have left."
          />
        </Card>
      </div>

      <Card title="Get started" className="mt-6">
        <EmptyState
          icon={AccountsIcon}
          title="Add your first account"
          description="Start with a bank account, e-wallet, credit card, or cash so transactions have somewhere to go."
          action={
            <Link href="/accounts" className={buttonClassName("primary")}>
              Go to accounts
            </Link>
          }
        />
      </Card>
    </>
  );
}
