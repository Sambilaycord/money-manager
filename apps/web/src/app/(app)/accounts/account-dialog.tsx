"use client";

import type { AccountInput } from "@money-manager/shared";
import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { CurrencyOption } from "@/lib/currencies";
import { AccountForm, type AccountFormMode } from "./account-form";
import type { AccountFormAction } from "./actions";

const TITLE: Record<AccountFormMode, string> = {
  create: "Add account",
  edit: "Edit account",
};

interface AccountDialogProps {
  mode: AccountFormMode;
  initial: AccountInput;
  action: AccountFormAction;
  currencyOptions: CurrencyOption[];
  triggerLabel: string;
  triggerVariant?: "primary" | "secondary";
}

export function AccountDialog({
  mode,
  initial,
  action,
  currencyOptions,
  triggerLabel,
  triggerVariant = "primary",
}: AccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName(triggerVariant)}
      >
        {mode === "create" && <PlusIcon width={18} height={18} />}
        {triggerLabel}
      </button>
      <Modal open={isOpen} onClose={close} title={TITLE[mode]}>
        <AccountForm
          mode={mode}
          initial={initial}
          action={action}
          currencyOptions={currencyOptions}
          onSaved={close}
          onCancel={close}
        />
      </Modal>
    </>
  );
}
