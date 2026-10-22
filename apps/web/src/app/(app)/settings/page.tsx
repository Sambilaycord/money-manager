import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/(app)/actions";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { buttonClassName } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

async function ProfileDetails() {
  const user = await getCurrentUser();

  return (
    <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted">Name</dt>
      <dd>{user.fullName ?? "—"}</dd>
      <dt className="text-muted">Email</dt>
      <dd className="break-all">{user.email}</dd>
    </dl>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your profile and app preferences." />
      <div className="flex flex-col gap-6">
        <Card title="Profile">
          <Suspense fallback={<div className="h-12 animate-pulse rounded bg-border" />}>
            <ProfileDetails />
          </Suspense>
        </Card>
        <Card title="Session">
          <p className="mb-4 text-sm text-muted">
            Signing out here doesn&apos;t sign you out of the mobile app.
          </p>
          <form action={signOut}>
            <button type="submit" className={buttonClassName("secondary")}>
              Sign out
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
