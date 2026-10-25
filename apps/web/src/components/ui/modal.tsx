"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import type { ReactNode } from "react";
import { CloseIcon } from "@/components/icons";
import { iconButtonClassName } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Headless UI's Dialog rather than a native <dialog>: showModal() puts the
 * dialog in the browser's top layer, above the combobox lists that Headless
 * portals to <body>, so they rendered behind it.
 *
 * The panel unmounts on close, so a form inside starts fresh on each open.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-150 data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
          <DialogPanel
            transition
            className="w-full max-w-lg rounded-3xl border border-border bg-surface p-5 text-foreground shadow-overlay transition duration-150 data-closed:translate-y-2 data-closed:opacity-0 sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
              <button type="button" onClick={onClose} aria-label="Close" className={`${iconButtonClassName} -mr-2`}>
                <CloseIcon />
              </button>
            </div>
            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
