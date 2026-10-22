import type { Metadata } from "next";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { BudgetsIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Budgets" };

export default function BudgetsPage() {
  return (
    <>
      <PageHeader title="Budgets" description="Monthly spending limits by category." />
      <Card>
        <EmptyState
          icon={BudgetsIcon}
          title="No budgets yet"
          description="Set a limit for a category, like groceries or eating out, and track how much is left each month."
        />
      </Card>
    </>
  );
}
