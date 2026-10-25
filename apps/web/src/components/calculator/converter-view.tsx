"use client";

import {
  convertBetween,
  EXCHANGE_RATES_PROVIDER,
  formatMoney,
  parseAmountToCents,
  type ExchangeRates,
} from "@money-manager/shared";
import { useId, useState } from "react";
import { TransactionsIcon } from "@/components/icons";

// Rendered only after the person switches to the Convert tab, never on the
// server, so names from the browser's own Intl data can't cause a mismatch.
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const updatedFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

const selectClassName =
  "h-10 w-full min-w-0 rounded-xl border border-border bg-surface px-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

function defaultFromCurrency(base: string): string {
  return base === "USD" ? "EUR" : "USD";
}

interface ConverterViewProps {
  rates: ExchangeRates | null;
  /** The calculator's current result, so a figure worked out there carries over. */
  initialAmount: string;
}

export function ConverterView({ rates, initialAmount }: ConverterViewProps) {
  const id = useId();
  const [amount, setAmount] = useState(initialAmount);
  const [from, setFrom] = useState(() => (rates ? defaultFromCurrency(rates.base) : ""));
  const [to, setTo] = useState(() => rates?.base ?? "");

  if (!rates) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        Exchange rates aren&apos;t available right now. Try again in a little while.
      </p>
    );
  }

  const codes = Object.keys(rates.rates).sort();
  const parsed = amount.trim() ? parseAmountToCents(amount) : null;
  const result = parsed?.ok ? convertBetween(parsed.cents, from, to, rates) : null;
  const unitRate = convertBetween(100, from, to, rates);

  const currencySelect = (label: string, value: string, onChange: (code: string) => void) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClassName}>
        {codes.map((code) => (
          <option key={code} value={code}>
            {code} · {currencyNames.of(code) ?? code}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
      <label htmlFor={`${id}-amount`} className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">Amount</span>
        <input
          id={`${id}-amount`}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          autoComplete="off"
          className="h-11 rounded-xl border border-border bg-surface px-3 text-right text-lg font-semibold tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
        />
      </label>
      <div className="flex items-end gap-2">
        {currencySelect("From", from, setFrom)}
        <button
          type="button"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          aria-label="Swap currencies"
          title="Swap"
          className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-sunken hover:text-foreground"
        >
          <TransactionsIcon width={16} height={16} className="rotate-90" />
        </button>
        {currencySelect("To", to, setTo)}
      </div>

      <div className="rounded-xl bg-surface-sunken px-3 py-3 text-right">
        <p className="truncate text-2xl font-semibold tracking-tight tabular-nums" aria-live="polite">
          {result !== null
            ? `≈ ${formatMoney(result, to)}`
            : parsed && !parsed.ok
              ? "Enter an amount like 1,250.50"
              : "—"}
        </p>
        {unitRate !== null && (
          <p className="mt-1 text-xs text-muted tabular-nums">
            1 {from} = {formatMoney(unitRate, to)}
          </p>
        )}
      </div>
      <p className="text-center text-[11px] text-muted">
        Rates updated {updatedFormat.format(new Date(rates.updatedAt))} ·{" "}
        <a href={EXCHANGE_RATES_PROVIDER.url} target="_blank" rel="noreferrer" className="underline">
          {EXCHANGE_RATES_PROVIDER.name}
        </a>
      </p>
    </div>
  );
}
