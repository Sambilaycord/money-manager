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
          tone="butter"
          title="Budgets are on the way"
          description="You'll be able to set a monthly limit for a category, like groceries or eating out, and see how much is left as you spend."
        />
      </Card>
    </>
  );
}
