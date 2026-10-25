import { HOME_TIME_ZONE } from "@money-manager/shared";
import type { Metadata } from "next";
import { Suspense, type ComponentType, type ReactNode, type SVGProps } from "react";
import { signOut } from "@/app/(app)/actions";
import { LockIcon, ShieldIcon, SignOutIcon, SunIcon, UserIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { toneClassName, type PastelTone } from "@/components/tone";
import { buttonClassName } from "@/components/ui/button";
import { listCurrencyOptions } from "@/lib/currencies";
import { getProfile } from "@/lib/profile";
import { listSignedInDevices, type SignedInDevice } from "@/lib/sessions";
import { AvatarPicker } from "./avatar-picker";
import { ChangePasswordForm } from "./change-password-form";
import { ProfileForm } from "./profile-form";
import { DeviceList, type DeviceRowData } from "./device-list";

export const metadata: Metadata = { title: "Settings" };

const signedInDateFormat = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: HOME_TIME_ZONE,
});
const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function timeAgo(iso: string, now: number): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

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

async function ProfileSettings() {
  const profile = await getProfile();
  return (
    <div className="flex flex-col gap-6">
      <AvatarPicker name={profile.fullName ?? profile.email} imageUrl={profile.avatarUrl} />
      <div className="border-t border-border pt-6">
        <ProfileForm
          fullName={profile.fullName}
          email={profile.email}
          defaultCurrency={profile.defaultCurrency}
          currencyOptions={listCurrencyOptions()}
        />
      </div>
    </div>
  );
}

/** The devices, plus the moment they were read, which "active 5 minutes ago" is measured from. */
async function loadDevices(): Promise<{ devices: SignedInDevice[]; now: number }> {
  const devices = await listSignedInDevices();
  return { devices, now: Date.now() };
}

function toRow(device: SignedInDevice, now: number): DeviceRowData {
  return {
    id: device.id,
    name: device.name,
    activity: device.isCurrent ? "Active now" : `Active ${timeAgo(device.lastActiveAt, now)}`,
    signedIn: `Signed in ${signedInDateFormat.format(new Date(device.signedInAt))}`,
    isCurrent: device.isCurrent,
  };
}

async function SessionSettings() {
  const { devices, now } = await loadDevices();
  return (
    <div className="flex flex-col gap-5">
      <DeviceList devices={devices.map((device) => toRow(device, now))} />
      <div className="border-t border-border pt-5">
        <form action={signOut}>
          <button type="submit" className={buttonClassName("ghost")}>
            <SignOutIcon width={18} height={18} />
            Sign out of this device
          </button>
        </form>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return <div aria-hidden="true" className="h-40 animate-pulse rounded-xl bg-surface-sunken" />;
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
          description="Your picture, name, and default currency, used across the website and the mobile app."
        >
          <Suspense fallback={<SettingsSkeleton />}>
            <ProfileSettings />
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
          icon={LockIcon}
          tone="peach"
          title="Password"
          description="You'll need your current one. Changing it signs you out everywhere else."
        >
          <ChangePasswordForm />
        </SettingsSection>
        <SettingsSection
          icon={ShieldIcon}
          tone="mint"
          title="Session"
          description="Everywhere you're signed in, including the mobile app. Tick the ones you don't recognise and sign them out."
        >
          <Suspense fallback={<SettingsSkeleton />}>
            <SessionSettings />
          </Suspense>
        </SettingsSection>
      </div>
    </>
  );
}
