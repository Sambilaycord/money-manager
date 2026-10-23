"use client";

import {
  isTransactionType,
  TRANSACTION_NOTE_MAX_LENGTH,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type Category,
  type TransactionInput,
  type TransactionType,
} from "@money-manager/shared";
import {
  startTransition,
  useActionState,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import type { TransactionFormAction, TransactionFormState } from "./actions";

export type TransactionFormMode = "create" | "edit";

export interface TransactionAccountOption {
  id: string;
  name: string;
  currency: string;
}

const SUBMIT_LABEL: Record<TransactionFormMode, string> = {
  create: "Add transaction",
  edit: "Save changes",
};

function TypePicker({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Type</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-sunken p-1">
        {TRANSACTION_TYPES.map((type) => (
          <label
            key={type}
            className="cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium text-muted has-checked:bg-surface has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-primary"
          >
            <input
              type="radio"
              name="type"
              value={type}
              checked={value === type}
              onChange={() => onChange(type)}
              className="sr-only"
            />
            {TRANSACTION_TYPE_LABELS[type]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function accountLabel(account: TransactionAccountOption): string {
  return `${account.name} · ${account.currency}`;
}

/** Two-step so a stray click can't delete anything. */
function DeleteButton({
  onDelete,
}: {
  onDelete: () => Promise<TransactionFormState>;
}) {
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

interface TransactionFormProps {
  mode: TransactionFormMode;
  initial: TransactionInput;
  action: TransactionFormAction;
  accounts: TransactionAccountOption[];
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
  /** Edit mode only. */
  onDelete?: () => Promise<TransactionFormState>;
}

export function TransactionForm({
  mode,
  initial,
  action,
  accounts,
  categories,
  onSaved,
  onCancel,
  onDelete,
}: TransactionFormProps) {
  const [state, dispatch, isPending] = useActionState<TransactionFormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.saved) onSaved();
      return next;
    },
    {},
  );
  const [type, setType] = useState<TransactionType>(
    isTransactionType(initial.type) ? initial.type : "expense",
  );
  const [accountId, setAccountId] = useState(initial.accountId || (accounts[0]?.id ?? ""));
  const [transferAccountId, setTransferAccountId] = useState(initial.transferAccountId);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  // Every row on the page can open its own copy of this form.
  const idPrefix = useId();

  const source = accounts.find((account) => account.id === accountId);
  // The database rejects transfers across currencies, so only matching
  // accounts are offered.
  const destinations = accounts.filter(
    (account) => account.id !== accountId && account.currency === source?.currency,
  );
  const matchingCategories = categories.filter((category) => category.type === type);
  // Switching type or source can strand a choice the new lists don't offer;
  // fall back rather than submit something the person can't see.
  const shownDestination = destinations.some((account) => account.id === transferAccountId)
    ? transferAccountId
    : "";
  const shownCategory = matchingCategories.some((category) => category.id === categoryId)
    ? categoryId
    : "";

  // Submitted by hand rather than through <form action>: React resets a form
  // after every action, which wipes what the person typed whenever validation
  // fails.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <TypePicker value={type} onChange={setType} />
      <Field
        id={`${idPrefix}-amount`}
        label={source ? `Amount (${source.currency})` : "Amount"}
        name="amount"
        defaultValue={initial.amount}
        inputMode="decimal"
        placeholder="0.00"
        autoComplete="off"
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id={`${idPrefix}-account`}
          label={type === "transfer" ? "From" : "Account"}
          name="accountId"
          options={accounts.map((account) => ({ value: account.id, label: accountLabel(account) }))}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        />
        {type === "transfer" ? (
          <SelectField
            id={`${idPrefix}-transfer-account`}
            label="To"
            name="transferAccountId"
            options={[
              {
                value: "",
                label: destinations.length > 0 ? "Choose an account" : "No other account in this currency",
              },
              ...destinations.map((account) => ({ value: account.id, label: accountLabel(account) })),
            ]}
            value={shownDestination}
            onChange={(event) => setTransferAccountId(event.target.value)}
          />
        ) : (
          <SelectField
            id={`${idPrefix}-category`}
            label="Category"
            name="categoryId"
            options={[
              { value: "", label: "Uncategorised" },
              ...matchingCategories.map((category) => ({ value: category.id, label: category.name })),
            ]}
            value={shownCategory}
            onChange={(event) => setCategoryId(event.target.value)}
          />
        )}
      </div>
      <Field
        id={`${idPrefix}-date`}
        label="Date"
        name="occurredOn"
        type="date"
        defaultValue={initial.occurredOn}
        required
      />
      <Field
        id={`${idPrefix}-note`}
        label="Note"
        name="note"
        defaultValue={initial.note}
        placeholder="Optional"
        maxLength={TRANSACTION_NOTE_MAX_LENGTH}
      />
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
