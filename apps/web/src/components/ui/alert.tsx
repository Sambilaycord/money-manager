import type { ReactNode } from "react";

type AlertTone = "error" | "info";

const tones: Record<AlertTone, string> = {
  error: "border-danger/25 bg-danger-soft text-danger",
  info: "border-cloud-ink/15 bg-cloud text-cloud-ink",
};

export function Alert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-3.5 py-2.5 text-sm ${tones[tone]}`}
    >
      {children}
    </p>
  );
}
