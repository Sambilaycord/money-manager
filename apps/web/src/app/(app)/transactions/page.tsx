import type { Metadata } from "next";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { TransactionsIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every income, expense, and transfer across your accounts."
      />
      <Card>
        <EmptyState
          icon={TransactionsIcon}
          title="No transactions yet"
          description="Once accounts are set up, you'll be able to record and search transactions here, filtered by account, category, and date."
        />
      </Card>
    </>
  );
}
