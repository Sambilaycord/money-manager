"use client";

import {
  BUDGET_PERIODS,
  BUDGET_PERIOD_LABELS,
  formatMonthLabel,
  isBudgetPeriod,
  isMonth,
  monthsBetween,
  shiftMonth,
  type BudgetInput,
  type BudgetPeriod,
} from "@money-manager/shared";
import { startTransition, useActionState, useId, useState, type FormEvent } from "react";
import { CategoryCombobox, type CategorySuggestion } from "@/components/category-combobox";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, SelectField } from "@/components/ui/field";
import type { CurrencyOption } from "@/lib/currencies";
import type { BudgetFormAction, BudgetFormState } from "./actions";

export type BudgetFormMode = "create" | "edit";

export type BudgetCategoryOption = CategorySuggestion;

const PERIOD_OPTIONS = BUDGET_PERIODS.map((period) => ({
  value: period,
  label: BUDGET_PERIOD_LABELS[period].option,
}));

// How far the month pickers reach either side of the month on screen.
const MONTHS_BACK = 12;
const MONTHS_AHEAD = 24;

/**
 * Months to offer, oldest first, around `anchor`; a saved range outside that
 * window is still included so editing never silently moves it.
 */
function monthOptions(anchor: string, ...alsoInclude: string[]) {
  const months = new Set(
    Array.from({ length: MONTHS_BACK + MONTHS_AHEAD + 1 }, (_, index) =>
      shiftMonth(anchor, index - MONTHS_BACK),
    ),
  );
  for (const month of alsoInclude) if (isMonth(month)) months.add(month);
  return [...months].sort().map((month) => ({ value: month, label: formatMonthLabel(month) }));
}

function limitLabel(period: BudgetPeriod, startMonth: string, endMonth: string): string {
  if (period !== "range") return BUDGET_PERIOD_LABELS[period].limit;
  const count = monthsBetween(startMonth, endMonth) + 1;
  return count === 1 ? "Limit for the month" : `Total for ${count} months`;
}

const PERIOD_HINT: Record<BudgetPeriod, string> = {
  monthly: "",
  yearly: "Each month is held to a twelfth of the yearly limit, for costs that don't land evenly. ",
  range:
    "The total is shared evenly across the months, and stands in for any ongoing budget on this category during them. ",
};

const SUBMIT_LABEL: Record<BudgetFormMode, string> = {
  create: "Add budget",
  edit: "Save changes",
};

interface BudgetFormProps {
  mode: BudgetFormMode;
  initial: BudgetInput;
  /** YYYY-MM on screen; the month pickers are built around it. */
  month: string;
  action: BudgetFormAction;
  /**
   * Create mode: the expense categories still without a budget, offered as
   * suggestions; a new name typed in becomes a category. Edit mode: just the
   * budget's own category, which can't change.
   */
  categories: BudgetCategoryOption[];
  currencyOptions: CurrencyOption[];
  onSaved: () => void;
  onCancel: () => void;
  /** Edit mode only. */
  onDelete?: () => Promise<BudgetFormState>;
}

export function BudgetForm({
  mode,
  initial,
  month,
  action,
  categories,
  currencyOptions,
  onSaved,
  onCancel,
  onDelete,
}: BudgetFormProps) {
  const [state, dispatch, isPending] = useActionState<BudgetFormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.saved) onSaved();
      return next;
    },
    {},
  );
  // Every budget row can open its own copy of this form.
  const idPrefix = useId();
  const ownCategory = categories.find((category) => category.id === initial.categoryId);
  // Create mode starts from a category handed in by "Set budget", if any.
  const [categoryName, setCategoryName] = useState<string | null>(ownCategory?.name ?? null);
  const [period, setPeriod] = useState<BudgetPeriod>(
    isBudgetPeriod(initial.period) ? initial.period : "monthly",
  );
  const [startMonth, setStartMonth] = useState(isMonth(initial.startMonth) ? initial.startMonth : month);
  const [endMonth, setEndMonth] = useState(isMonth(initial.endMonth) ? initial.endMonth : month);
  const startOptions = monthOptions(month, initial.startMonth);
  const endOptions = monthOptions(month, initial.endMonth).filter((option) => option.value >= startMonth);

  // Moving the first month past the last drags the last along with it.
  const changeStartMonth = (next: string) => {
    setStartMonth(next);
    if (endMonth < next) setEndMonth(next);
  };

  // Submitted by hand rather than through <form action>: React resets a form
  // after every action, which wipes what the person typed whenever validation
  // fails, and blanks the currency combobox, whose text React doesn't own.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[9rem_1fr]">
        <SelectField
          id={`${idPrefix}-period`}
          label="Budget"
          name="period"
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(event) => {
            if (isBudgetPeriod(event.target.value)) setPeriod(event.target.value);
          }}
        />
        {mode === "edit" ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Category</p>
            <p className="flex h-10 items-center text-sm text-muted">
              {ownCategory?.name ?? "Unknown category"}
            </p>
            <input type="hidden" name="categoryId" value={initial.categoryId} />
          </div>
        ) : (
          <CategoryCombobox
            label="Category"
            name="categoryName"
            categories={categories}
            isOptional={false}
            value={categoryName}
            onChange={setCategoryName}
          />
        )}
      </div>
      {period === "range" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id={`${idPrefix}-start-month`}
            label="From"
            name="startMonth"
            options={startOptions}
            value={startMonth}
            onChange={(event) => changeStartMonth(event.target.value)}
          />
          <SelectField
            id={`${idPrefix}-end-month`}
            label="To"
            name="endMonth"
            options={endOptions}
            value={endMonth}
            onChange={(event) => setEndMonth(event.target.value)}
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[9rem_1fr]">
        <CurrencyCombobox
          label="Currency"
          name="currency"
          options={currencyOptions}
          defaultCode={initial.currency}
        />
        <Field
          id={`${idPrefix}-amount`}
          label={limitLabel(period, startMonth, endMonth)}
          name="amount"
          defaultValue={initial.amount}
          inputMode="decimal"
          placeholder="0.00"
          autoComplete="off"
          required
        />
      </div>
      <p className="text-xs text-muted">
        {PERIOD_HINT[period]}
        Only expenses in this currency count toward the limit, since amounts in different currencies
        can&apos;t be added together.
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
        {onDelete ? <DeleteButton onDelete={onDelete} /> : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={buttonClassName("ghost")}>
            Cancel
          </button>
          <button type="submit" disabled={isPending} className={buttonClassName("primary")}>
            {isPending ? "Saving…" : SUBMIT_LABEL[mode]}
          </button>
        </div>
      </div>
    </form>
  );
}
