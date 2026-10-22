import type { ReactNode } from "react";

type AlertTone = "error" | "info";

const tones: Record<AlertTone, string> = {
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-primary/30 bg-primary-soft text-foreground",
};

export function Alert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}
    >
      {children}
    </p>
  );
}
