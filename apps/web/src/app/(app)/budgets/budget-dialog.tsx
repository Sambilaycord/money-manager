"use client";

import type { BudgetInput } from "@money-manager/shared";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import type { CurrencyOption } from "@/lib/currencies";
import type { BudgetFormAction, BudgetFormState } from "./actions";
import { BudgetForm, type BudgetCategoryOption, type BudgetFormMode } from "./budget-form";

const TITLE: Record<BudgetFormMode, string> = {
  create: "Add budget",
  edit: "Edit budget",
};

interface BudgetDialogProps {
  mode: BudgetFormMode;
  initial: BudgetInput;
  /** YYYY-MM on screen; the month pickers are built around it. */
  month: string;
  action: BudgetFormAction;
  /** Edit mode only; bound to the budget id by the page. */
  deleteAction?: () => Promise<BudgetFormState>;
  categories: BudgetCategoryOption[];
  currencyOptions: CurrencyOption[];
  trigger: ReactNode;
  triggerClassName: string;
}

export function BudgetDialog({
  mode,
  initial,
  month,
  action,
  deleteAction,
  categories,
  currencyOptions,
  trigger,
  triggerClassName,
}: BudgetDialogProps) {
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
        <BudgetForm
          mode={mode}
          initial={initial}
          month={month}
          action={action}
          categories={categories}
          currencyOptions={currencyOptions}
          onSaved={close}
          onCancel={close}
          onDelete={deleteAndClose}
        />
      </Modal>
    </>
  );
}
