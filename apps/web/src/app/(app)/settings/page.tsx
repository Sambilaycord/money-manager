import type { Metadata } from "next";
import { Suspense, type ComponentType, type ReactNode, type SVGProps } from "react";
import { signOut } from "@/app/(app)/actions";
import { initialsOf } from "@/components/app/user-menu";
import { GlobeIcon, ShieldIcon, SignOutIcon, SunIcon, UserIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { toneClassName, type PastelTone } from "@/components/tone";
import { buttonClassName } from "@/components/ui/button";
import { getDefaultCurrency } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });

interface SettingsSectionProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: PastelTone;
  title: string;
  description: string;
  children: ReactNode;
}

/** A heading column beside a card, so each group explains itself without crowding its contents. */
function SettingsSection({ icon: Icon, tone, title, description, children }: SettingsSectionProps) {
  return (
    <section className="grid grid-cols-1 gap-4 py-8 first:pt-0 lg:grid-cols-[16rem_1fr] lg:gap-10">
      <div className="flex gap-3 lg:flex-col">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${toneClassName[tone]}`}>
          <Icon width={18} height={18} />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">{children}</div>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-all sm:text-right">{children}</dd>
    </div>
  );
}

async function ProfileDetails() {
  const user = await getCurrentUser();
  const displayName = user.fullName ?? user.email;

  return (
    <>
      <div className="mb-5 flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky to-cloud text-lg font-semibold text-sky-ink"
        >
          {initialsOf(displayName)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{displayName}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>
      <dl className="divide-y divide-border border-t border-border pt-3">
        <DetailRow label="Name">{user.fullName ?? <span className="font-normal text-muted">Not set</span>}</DetailRow>
        <DetailRow label="Email">{user.email}</DetailRow>
      </dl>
    </>
  );
}

async function PreferenceDetails() {
  const currency = await getDefaultCurrency();
  return (
    <dl>
      <DetailRow label="Default currency">
        {currency}
        <span className="block text-xs font-normal text-muted">{currencyNames.of(currency)}</span>
      </DetailRow>
    </dl>
  );
}

function DetailsSkeleton() {
  return <div aria-hidden="true" className="h-24 animate-pulse rounded-xl bg-surface-sunken" />;
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your profile and app preferences." />
      <div className="divide-y divide-border">
        <SettingsSection
          icon={UserIcon}
          tone="cloud"
          title="Profile"
          description="How you appear across the website and the mobile app."
        >
          <Suspense fallback={<DetailsSkeleton />}>
            <ProfileDetails />
          </Suspense>
        </SettingsSection>
        <SettingsSection
          icon={SunIcon}
          tone="butter"
          title="Appearance"
          description="A daytime sky, a night sky, or whichever your device is set to. Saved on this browser."
        >
          <ThemeSwitcher />
        </SettingsSection>
        <SettingsSection
          icon={GlobeIcon}
          tone="sky"
          title="Preferences"
          description="New accounts start in your default currency."
        >
          <Suspense fallback={<DetailsSkeleton />}>
            <PreferenceDetails />
          </Suspense>
        </SettingsSection>
        <SettingsSection
          icon={ShieldIcon}
          tone="mint"
          title="Session"
          description="Signing out here doesn't sign you out of the mobile app."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">You&apos;re signed in on this browser.</p>
            <form action={signOut}>
              <button type="submit" className={buttonClassName("secondary")}>
                <SignOutIcon width={18} height={18} />
                Sign out
              </button>
            </form>
          </div>
        </SettingsSection>
      </div>
    </>
  );
}
