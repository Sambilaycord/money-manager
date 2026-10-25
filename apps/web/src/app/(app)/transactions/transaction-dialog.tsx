"use client";

import type { Category, TransactionInput } from "@money-manager/shared";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import type { TransactionFormAction, TransactionFormState } from "./actions";
import {
  TransactionForm,
  type TransactionAccountOption,
  type TransactionFormMode,
} from "./transaction-form";

const TITLE: Record<TransactionFormMode, string> = {
  create: "Add transaction",
  edit: "Edit transaction",
};

interface TransactionDialogProps {
  mode: TransactionFormMode;
  initial: TransactionInput;
  action: TransactionFormAction;
  /** Edit mode only; bound to the transaction id by the page. */
  deleteAction?: () => Promise<TransactionFormState>;
  accounts: TransactionAccountOption[];
  categories: Category[];
  trigger: ReactNode;
  triggerClassName: string;
}

export function TransactionDialog({
  mode,
  initial,
  action,
  deleteAction,
  accounts,
  categories,
  trigger,
  triggerClassName,
}: TransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  const deleteAndClose = deleteAction
    ? async () => {
        const result = await deleteAction();
        if (result.saved) close();
        return result;
      }
    : undefined;

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={triggerClassName}>
        {trigger}
      </button>
      <Modal open={isOpen} onClose={close} title={TITLE[mode]}>
        <TransactionForm
          mode={mode}
          initial={initial}
          action={action}
          accounts={accounts}
          categories={categories}
          onSaved={close}
          onCancel={close}
          onDelete={deleteAndClose}
        />
      </Modal>
    </>
  );
}
