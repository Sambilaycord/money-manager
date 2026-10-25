"use client";

import { formatMoney } from "@money-manager/shared";
import { startTransition, useActionState, useId, useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import type { MoneyAccountOption } from "@/lib/accounts";

interface FormState {
  saved?: boolean;
  error?: string;
}

export interface SetAsideView {
  id: string;
  accountName: string;
  amountCents: number;
}

/** Two-step, so a stray tap doesn't free money the person meant to keep reserved. */
function ReleaseButton({ label, onRelease }: { label: string; onRelease: () => Promise<FormState> }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startRelease] = useTransition();

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        aria-label={`Release ${label}`}
        className={buttonClassName("ghost", "h-8 px-2.5 text-xs")}
      >
        Release
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startRelease(async () => {
            const result = await onRelease();
            if (result.error) setError(result.error);
          })
        }
        className={buttonClassName("ghost", "h-8 px-2.5 text-xs text-danger hover:text-danger")}
      >
        {isPending ? "Releasing…" : "Yes, release"}
      </button>
      <button
        type="button"
        onClick={() => setIsConfirming(false)}
        className={buttonClassName("ghost", "h-8 px-2.5 text-xs")}
      >
        Keep
      </button>
    </span>
  );
}

interface SetAsidePanelProps {
  title: string;
  /** e.g. "Money you keep in an account for this, so it isn't spent on something else." */
  description: string;
  currency: string;
  setAsides: SetAsideView[];
  /** Every account; only non-card ones in `currency` are offered. */
  accounts: MoneyAccountOption[];
  /** Bound to the purpose by the page. */
  setAsideAction: (previous: FormState, formData: FormData) => Promise<FormState>;
  releaseAction: (setAsideId: string) => Promise<FormState>;
}

/**
 * Money reserved in real accounts for one purpose: what's held where, a way to
 * release it, and a form to set more aside from what's free.
 */
export function SetAsidePanel({
  title,
  description,
  currency,
  setAsides,
  accounts,
  setAsideAction,
  releaseAction,
}: SetAsidePanelProps) {
  const eligible = accounts.filter((account) => !account.isCard && account.currency === currency);
  const [accountId, setAccountId] = useState(
    () => [...eligible].sort((a, b) => b.availableCents - a.availableCents)[0]?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [state, dispatch, isPending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const next = await setAsideAction(previous, formData);
      if (next.saved) setAmount("");
      return next;
    },
    {},
  );
  const idPrefix = useId();
  const chosen = eligible.find((account) => account.id === accountId);

  // Submitted by hand so a failed save keeps what was typed.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface-sunken p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>

      {setAsides.length > 0 && (
        <ul className="divide-y divide-border rounded-xl bg-surface px-3">
          {setAsides.map((setAside) => {
            const amountText = formatMoney(setAside.amountCents, currency);
            return (
              <li key={setAside.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium tabular-nums">{amountText}</span>
                  <span className="block truncate text-xs text-muted">in {setAside.accountName}</span>
                </span>
                <ReleaseButton
                  label={`${amountText} set aside in ${setAside.accountName}`}
                  onRelease={() => releaseAction(setAside.id)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {eligible.length === 0 ? (
        <p className="text-xs text-muted">
          You don&apos;t have a {currency} bank, e-wallet, or cash account to set money aside in.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)]">
            <SelectField
              id={`${idPrefix}-account`}
              label="From account"
              name="accountId"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              options={eligible.map((account) => ({
                value: account.id,
                label: `${account.name} · ${formatMoney(Math.max(account.availableCents, 0), currency)} free`,
              }))}
            />
            <Field
              id={`${idPrefix}-amount`}
              label="Amount"
              name="amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              required
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted tabular-nums">
              {chosen && `${formatMoney(Math.max(chosen.availableCents, 0), currency)} free to set aside`}
            </p>
            <button type="submit" disabled={isPending} className={buttonClassName("primary")}>
              {isPending ? "Setting aside…" : "Set aside"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
