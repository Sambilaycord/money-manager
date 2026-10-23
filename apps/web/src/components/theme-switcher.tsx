"use client";

import { useId } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons";
import { setThemePreference, useThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: readonly { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: "system", label: "System", Icon: MonitorIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

interface ThemeSwitcherProps {
  /** Icons only, for tight spots like the sidebar; labels stay available to screen readers. */
  compact?: boolean;
}

/** Native radios underneath, so arrow keys move between options for free. */
export function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const preference = useThemePreference();
  const name = useId();

  return (
    <fieldset
      className={`inline-grid grid-cols-3 gap-0.5 rounded-xl border border-border bg-surface-sunken p-0.5 ${
        compact ? "" : "w-full sm:w-auto"
      }`}
    >
      <legend className="sr-only">Theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => (
        <label
          key={value}
          title={compact ? label : undefined}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-[0.6rem] text-sm font-medium text-muted transition-colors hover:text-foreground has-checked:bg-surface has-checked:text-foreground has-checked:shadow-card has-focus-visible:outline-2 has-focus-visible:outline-primary ${
            compact ? "size-8" : "h-9 px-3"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={preference === value}
            onChange={() => setThemePreference(value)}
            className="sr-only"
          />
          <Icon width={16} height={16} />
          <span className={compact ? "sr-only" : ""}>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
