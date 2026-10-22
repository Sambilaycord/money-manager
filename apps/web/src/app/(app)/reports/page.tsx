import type { Metadata } from "next";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { ReportsIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Trends in your income and spending over time." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Spending by category">
          <EmptyState
            icon={ReportsIcon}
            title="Nothing to chart yet"
            description="Record a few expenses to see where your money goes."
          />
        </Card>
        <Card title="Income vs. spending">
          <EmptyState
            icon={ReportsIcon}
            title="Nothing to chart yet"
            description="Month-by-month comparisons appear once you have transactions."
          />
        </Card>
      </div>
    </>
  );
}
