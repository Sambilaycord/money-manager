"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { signOutDevices } from "./actions";

/** One session, with its times already worded on the server so both renders agree. */
export interface DeviceRowData {
  id: string;
  name: string;
  /** e.g. "Active 5 minutes ago". */
  activity: string;
  /** e.g. "Signed in 23 Oct 2026". */
  signedIn: string;
  isCurrent: boolean;
}

/** Beyond this, older sessions wait behind a "Show all" button. */
const DEVICES_SHOWN = 8;

const checkboxClassName = "size-4 shrink-0 accent-primary";

function DeviceDetails({ device }: { device: DeviceRowData }) {
  return (
    <span className="min-w-0">
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {device.name}
        {device.isCurrent && (
          <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-medium text-mint-ink">
            This device
          </span>
        )}
      </span>
      <span className="block text-xs text-muted">
        {device.activity} · {device.signedIn}
      </span>
    </span>
  );
}

/**
 * Every session, with a checkbox on each one except this device, so the
 * person decides exactly which to sign out.
 */
export function DeviceList({ devices }: { devices: DeviceRowData[] }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startSigningOut] = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const others = devices.filter((device) => !device.isCurrent);
  // A device already signed out elsewhere drops off the list, so only count
  // picks that are still on it.
  const picked = others.filter((device) => selected.has(device.id));
  const allPicked = others.length > 0 && picked.length === others.length;
  const shown = showAll ? devices : devices.slice(0, DEVICES_SHOWN);
  const hiddenCount = devices.length - shown.length;

  // "Some but not all" can only be shown through the DOM property.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = picked.length > 0 && !allPicked;
    }
  }, [picked.length, allPicked]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allPicked ? new Set() : new Set(others.map((device) => device.id)));

  const signOutPicked = () => {
    setError(null);
    startSigningOut(async () => {
      const result = await signOutDevices(picked.map((device) => device.id));
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {others.length > 0 && (
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-surface-sunken">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allPicked}
            onChange={toggleAll}
            className={checkboxClassName}
          />
          Select all other devices
        </label>
      )}
      <ul className="divide-y divide-border">
        {shown.map((device) => (
          <li key={device.id}>
            {device.isCurrent ? (
              <div className="flex items-start gap-3 px-2 py-3">
                {/* Keeps the text in line with the checkbox rows. */}
                <span aria-hidden="true" className="size-4 shrink-0" />
                <DeviceDetails device={device} />
              </div>
            ) : (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-3 hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={selected.has(device.id)}
                  onChange={() => toggle(device.id)}
                  className={`${checkboxClassName} mt-0.5`}
                />
                <DeviceDetails device={device} />
              </label>
            )}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-start rounded px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Show all {devices.length} sessions
        </button>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {others.length === 0 ? (
        <p className="text-sm text-muted">You&apos;re not signed in anywhere else.</p>
      ) : (
        <button
          type="button"
          onClick={signOutPicked}
          disabled={isPending || picked.length === 0}
          className={buttonClassName("secondary", "self-start")}
        >
          {isPending
            ? "Signing out…"
            : picked.length === 0
              ? "Sign out selected"
              : `Sign out ${picked.length} ${picked.length === 1 ? "device" : "devices"}`}
        </button>
      )}
    </div>
  );
}
