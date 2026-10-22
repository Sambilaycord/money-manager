import type { Metadata } from "next";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { AccountsIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountsPage() {
  return (
    <>
      <PageHeader
        title="Accounts"
        description="Bank accounts, e-wallets, credit cards, and cash you track."
      />
      <Card>
        <EmptyState
          icon={AccountsIcon}
          title="No accounts yet"
          description="Each account keeps its own balance and currency. Transfers between accounts won't count as spending."
        />
      </Card>
    </>
  );
}
