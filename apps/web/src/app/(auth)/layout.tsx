import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui/alert";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const isConfigured = getSupabaseEnv() !== null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        {!isConfigured && (
          <div className="mb-6">
            <Alert tone="info">
              Supabase isn&apos;t connected yet. Add the project URL and anon key to{" "}
              <code className="font-mono">apps/web/.env.local</code> to enable sign-in.
            </Alert>
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
