"use client";

import type { ExchangeRates } from "@money-manager/shared";
import { useEffect, useId, useRef, useState } from "react";
import { CalculatorIcon, ChevronDownIcon } from "@/components/icons";
import { CalculatorPanel } from "./calculator-panel";
import { clampOffset, movedOffset, offsetOf, type CornerOffset } from "./corner-position";
import { useCornerDrag } from "./use-corner-drag";

/**
 * A round toggle fixed in the bottom-right corner that opens a calculator
 * above it. Only the calculator can be dragged; the toggle stays put so it is
 * always where the person expects it. The calculator stays mounted while
 * closed, so a calculation in progress survives closing it; where it was
 * dragged does not, so it always reopens in the same spot above the toggle.
 */
export function FloatingCalculator({ rates }: { rates: ExchangeRates | null }) {
  const [isOpen, setIsOpen] = useState(false);
  // Null means the default spot above the toggle.
  const [offset, setOffset] = useState<CornerOffset | null>(null);
  const panelContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const panelId = useId();
  const dragHandle = useCornerDrag(panelContainerRef, setOffset);

  const close = () => {
    setIsOpen(false);
    setOffset(null);
  };

  // Keep the calculator on screen when it opens and as the window resizes.
  useEffect(() => {
    const container = panelContainerRef.current;
    if (!isOpen || !container) return;
    const keepOnScreen = () => {
      // Never moved yet: measure where the default spot put it.
      const saved = offset ?? offsetOf(container);
      const rect = container.getBoundingClientRect();
      const clamped = clampOffset(saved, { width: rect.width, height: rect.height });
      if (clamped.right !== saved.right || clamped.bottom !== saved.bottom) setOffset(clamped);
    };
    keepOnScreen();
    window.addEventListener("resize", keepOnScreen);
    return () => window.removeEventListener("resize", keepOnScreen);
  }, [isOpen, offset]);

  // Focus follows the calculator as it opens and closes, but not on page
  // load, where grabbing focus would pull it away from the page itself.
  const hasOpened = useRef(false);
  useEffect(() => {
    if (isOpen) {
      hasOpened.current = true;
      panelRef.current?.focus();
    } else if (hasOpened.current) {
      toggleRef.current?.focus();
    }
  }, [isOpen]);

  const nudge = (dx: number, dy: number) => {
    const container = panelContainerRef.current;
    if (container) setOffset(movedOffset(container, dx, dy));
  };

  return (
    <>
      <div
        ref={panelContainerRef}
        id={panelId}
        hidden={!isOpen}
        // Opens just above the toggle (toggle offset + its 3.5rem height +
        // a 0.75rem gap) until dragged.
        style={offset ? { right: offset.right, bottom: offset.bottom } : undefined}
        className={`fixed z-40 ${offset ? "" : "right-4 bottom-[10.25rem] lg:right-6 lg:bottom-[5.75rem]"}`}
      >
        <CalculatorPanel
          ref={panelRef}
          rates={rates}
          titleId={titleId}
          onClose={close}
          dragHandle={dragHandle}
          onNudge={nudge}
        />
      </div>
      <button
        ref={toggleRef}
        type="button"
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        aria-label={isOpen ? "Close calculator" : "Open calculator"}
        aria-expanded={isOpen}
        aria-controls={panelId}
        title={isOpen ? "Close calculator" : "Calculator"}
        // Above the phone tab bar on small screens.
        className="fixed right-4 bottom-24 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-overlay transition-transform hover:scale-105 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 lg:right-6 lg:bottom-6"
      >
        {isOpen ? (
          <ChevronDownIcon width={24} height={24} />
        ) : (
          <CalculatorIcon width={24} height={24} />
        )}
      </button>
    </>
  );
}
