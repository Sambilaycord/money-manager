"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";

/** Two-step so a stray click can't delete anything. */
export function DeleteButton({ onDelete }: { onDelete: () => Promise<{ error?: string }> }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startDelete] = useTransition();

  const handleClick = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    startDelete(async () => {
      const result = await onDelete();
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert tone="error">{error}</Alert>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={buttonClassName("ghost", "text-danger hover:text-danger")}
      >
        {isPending ? "Deleting…" : isConfirming ? "Yes, delete it" : "Delete"}
      </button>
    </div>
  );
}
