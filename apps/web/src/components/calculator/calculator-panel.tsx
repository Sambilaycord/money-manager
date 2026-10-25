"use client";

import {
  EMPTY_CALC_STATE,
  evaluate,
  formatCalcNumber,
  formatExpression,
  pressEquals,
  pressKey,
  toCalcText,
  type CalcKey,
  type CalcResult,
  type ExchangeRates,
} from "@money-manager/shared";
import { useState, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { BackspaceIcon, CheckIcon, ChevronDownIcon, CopyIcon } from "@/components/icons";
import { ConverterView } from "./converter-view";

type PanelMode = "calculate" | "convert";

const MODES: readonly { mode: PanelMode; label: string }[] = [
  { mode: "calculate", label: "Calculate" },
  { mode: "convert", label: "Convert" },
];

type PadKey = CalcKey | "equals";

interface PadButton {
  key: PadKey;
  label: ReactNode;
  ariaLabel: string;
  look: "digit" | "function" | "operator" | "equals";
}

const PAD: readonly PadButton[] = [
  { key: "clear", label: "AC", ariaLabel: "Clear", look: "function" },
  { key: "backspace", label: <BackspaceIcon width={18} height={18} />, ariaLabel: "Backspace", look: "function" },
  { key: "percent", label: "%", ariaLabel: "Percent", look: "function" },
  { key: "/", label: "÷", ariaLabel: "Divide", look: "operator" },
  { key: "7", label: "7", ariaLabel: "7", look: "digit" },
  { key: "8", label: "8", ariaLabel: "8", look: "digit" },
  { key: "9", label: "9", ariaLabel: "9", look: "digit" },
  { key: "*", label: "×", ariaLabel: "Multiply", look: "operator" },
  { key: "4", label: "4", ariaLabel: "4", look: "digit" },
  { key: "5", label: "5", ariaLabel: "5", look: "digit" },
  { key: "6", label: "6", ariaLabel: "6", look: "digit" },
  { key: "-", label: "−", ariaLabel: "Subtract", look: "operator" },
  { key: "1", label: "1", ariaLabel: "1", look: "digit" },
  { key: "2", label: "2", ariaLabel: "2", look: "digit" },
  { key: "3", label: "3", ariaLabel: "3", look: "digit" },
  { key: "+", label: "+", ariaLabel: "Add", look: "operator" },
  { key: "negate", label: "±", ariaLabel: "Change sign", look: "function" },
  { key: "0", label: "0", ariaLabel: "0", look: "digit" },
  { key: ".", label: ".", ariaLabel: "Decimal point", look: "digit" },
  { key: "equals", label: "=", ariaLabel: "Equals", look: "equals" },
];

const lookClass: Record<PadButton["look"], string> = {
  digit: "bg-surface-sunken text-foreground hover:bg-border",
  function: "bg-cloud text-cloud-ink hover:brightness-95",
  operator: "bg-sky text-sky-ink hover:brightness-95",
  equals: "bg-primary text-primary-foreground hover:bg-primary-hover",
};

/** Physical keys accepted while the calculator has focus. */
const KEYBOARD: Record<string, PadKey> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  ".": ".", ",": ".",
  "+": "+", "-": "-", "*": "*", x: "*", X: "*", "/": "/",
  "%": "percent",
  Enter: "equals", "=": "equals",
  Backspace: "backspace", Delete: "clear", c: "clear", C: "clear",
};

const ERROR_TEXT: Record<Exclude<CalcResult, { ok: true }>["error"], string> = {
  empty: "",
  divide_by_zero: "Can't divide by zero",
  too_large: "Too large to show exactly",
};

type CopyStatus = "idle" | "copied" | "failed";

interface CalculatorPanelProps {
  /** Focused by the widget when it opens, so typing works straight away. */
  ref: Ref<HTMLDivElement>;
  /** For the Convert tab; null when rates couldn't be loaded. */
  rates: ExchangeRates | null;
  titleId: string;
  onClose: () => void;
  /** Pointer handlers that drag the whole widget; spread on the title bar. */
  dragHandle: HTMLAttributes<HTMLElement>;
  /** Moves the widget by a step, for people who can't drag. */
  onNudge: (dx: number, dy: number) => void;
}

const NUDGE_STEP = 24;
const ARROW_NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-NUDGE_STEP, 0],
  ArrowRight: [NUDGE_STEP, 0],
  ArrowUp: [0, -NUDGE_STEP],
  ArrowDown: [0, NUDGE_STEP],
};

export function CalculatorPanel({
  ref,
  rates,
  titleId,
  onClose,
  dragHandle,
  onNudge,
}: CalculatorPanelProps) {
  const [mode, setMode] = useState<PanelMode>("calculate");
  const [state, setState] = useState(EMPTY_CALC_STATE);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  // Announced to screen readers only on "=", not on every keystroke.
  const [announcement, setAnnouncement] = useState("");

  const result = evaluate(state.tokens);
  const expression = formatExpression(state.tokens);

  const press = (key: PadKey) => {
    setCopyStatus("idle");
    if (key !== "equals") {
      setState((current) => pressKey(current, key));
      return;
    }
    setState((current) => pressEquals(current));
    setAnnouncement(
      result.ok ? `Equals ${formatCalcNumber(toCalcText(result.value))}` : ERROR_TEXT[result.error],
    );
  };

  const copyResult = async () => {
    if (!result.ok) return;
    try {
      // Plain digits without grouping commas, so it pastes cleanly into an amount field.
      await navigator.clipboard.writeText(toCalcText(result.value));
      setCopyStatus("copied");
    } catch (error) {
      console.error("Copying the calculator result failed", error);
      setCopyStatus("failed");
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    // In Convert, keys belong to the amount field and the selects.
    if (mode !== "calculate") return;
    // Leave modified keys (Ctrl+C, Cmd+V, ...) to the browser.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = KEYBOARD[event.key];
    if (!key) return;
    event.preventDefault();
    press(key);
  };

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      ref={ref}
      className="flex w-72 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-overlay outline-none"
    >
      <div
        {...dragHandle}
        tabIndex={0}
        aria-label="Move calculator: drag, or use the arrow keys"
        onKeyDown={(event) => {
          const step = ARROW_NUDGE[event.key];
          if (!step) return;
          event.preventDefault();
          event.stopPropagation();
          onNudge(step[0], step[1]);
        }}
        className="flex cursor-grab touch-none items-center justify-between gap-2 border-b border-border px-4 py-2.5 select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary active:cursor-grabbing"
      >
        <h2 id={titleId} className="text-sm font-semibold">
          Calculator
        </h2>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xs text-muted">
            Drag to move
          </span>
          <button
            type="button"
            onClick={onClose}
            // Pressing the button must not start dragging the title bar it sits in.
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Collapse calculator"
            title="Collapse"
            className="rounded-lg p-1 text-muted hover:bg-surface-sunken hover:text-foreground"
          >
            <ChevronDownIcon width={18} height={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-3 pt-3" role="group" aria-label="Calculator mode">
        {MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            aria-pressed={mode === option.mode}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              mode === option.mode
                ? "bg-primary-soft text-primary"
                : "text-muted hover:bg-surface-sunken hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === "convert" ? (
        <ConverterView
          rates={rates}
          initialAmount={result.ok && result.value > 0 ? toCalcText(result.value) : ""}
        />
      ) : (
        <>
          <div className="px-4 pt-3 pb-2">
            <p className="min-h-5 truncate text-right text-sm text-muted [direction:rtl]" title={expression}>
              {/* rtl keeps the newest part visible when the expression is long; the
                  bdi stops it from reordering the numbers and operators. */}
              <bdi>{expression}</bdi>
            </p>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={copyResult}
                disabled={!result.ok}
                aria-label={copyStatus === "copied" ? "Copied" : "Copy result"}
                title={copyStatus === "failed" ? "Couldn't copy" : "Copy result"}
                className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-sunken hover:text-foreground disabled:opacity-40"
              >
                {copyStatus === "copied" ? (
                  <CheckIcon width={16} height={16} />
                ) : (
                  <CopyIcon width={16} height={16} />
                )}
              </button>
              <p
                className={`min-w-0 truncate text-right font-semibold tracking-tight tabular-nums ${
                  result.ok || result.error === "empty" ? "text-3xl" : "text-base text-danger"
                }`}
              >
                {result.ok
                  ? formatCalcNumber(toCalcText(result.value))
                  : result.error === "empty"
                    ? "0"
                    : ERROR_TEXT[result.error]}
              </p>
            </div>
            <p role="status" className="sr-only">
              {announcement}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-3 pt-1">
            {PAD.map((button) => (
              <button
                key={button.key}
                type="button"
                onClick={() => press(button.key)}
                aria-label={button.ariaLabel}
                className={`flex h-11 items-center justify-center rounded-xl text-lg font-medium transition-colors ${lookClass[button.look]}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
