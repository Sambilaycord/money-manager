"use client";

import {
  isUtangDirection,
  UTANG_DIRECTIONS,
  UTANG_DIRECTION_LABELS,
  UTANG_NOTE_MAX_LENGTH,
  UTANG_PERSON_MAX_LENGTH,
  type UtangDirection,
  type UtangInput,
} from "@money-manager/shared";
import { startTransition, useActionState, useId, useState, type FormEvent } from "react";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import type { MoneyAccountOption } from "@/lib/accounts";
import type { CurrencyOption } from "@/lib/currencies";
import type { UtangFormAction, UtangFormState } from "./actions";

export type UtangFormMode = "create" | "edit";

const SUBMIT_LABEL: Record<UtangFormMode, string> = {
  create: "Add utang",
  edit: "Save changes",
};

function DirectionPicker({
  value,
  onChange,
}: {
  value: UtangDirection;
  onChange: (direction: UtangDirection) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Who owes whom</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-sunken p-1">
        {UTANG_DIRECTIONS.map((direction) => (
          <label
            key={direction}
            className="cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium text-muted has-checked:bg-surface has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-primary"
          >
            <input
              type="radio"
              name="direction"
              value={direction}
              checked={value === direction}
              onChange={() => onChange(direction)}
              className="sr-only"
            />
            {UTANG_DIRECTION_LABELS[direction].option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface UtangFormProps {
  mode: UtangFormMode;
  initial: UtangInput;
  action: UtangFormAction;
  currencyOptions: CurrencyOption[];
  /** Names already used, offered as suggestions so one person is spelled one way. */
  knownPeople: string[];
  accounts: MoneyAccountOption[];
  onSaved: () => void;
  onCancel: () => void;
}

// Where the money went or came from, worded for who owes whom.
const ACCOUNT_LABEL: Record<UtangDirection, string> = {
  owed_to_me: "Lent from (optional)",
  i_owe: "Received into (optional)",
};

export function UtangForm({
  mode,
  initial,
  action,
  currencyOptions,
  knownPeople,
  accounts,
  onSaved,
  onCancel,
}: UtangFormProps) {
  const [state, dispatch, isPending] = useActionState<UtangFormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.saved) onSaved();
      return next;
    },
    {},
  );
  const [direction, setDirection] = useState<UtangDirection>(
    isUtangDirection(initial.direction) ? initial.direction : "owed_to_me",
  );
  const [person, setPerson] = useState(initial.person);
  // Every row can open its own copy of this form.
  const idPrefix = useId();
  const peopleListId = `${idPrefix}-people`;

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
      <DirectionPicker value={direction} onChange={setDirection} />
      <Field
        id={`${idPrefix}-person`}
        label={UTANG_DIRECTION_LABELS[direction].person}
        name="person"
        value={person}
        onChange={(event) => setPerson(event.target.value)}
        placeholder="e.g. Ate Joy, Marco"
        list={peopleListId}
        autoComplete="off"
        characterLimit={UTANG_PERSON_MAX_LENGTH}
        required
      />
      <datalist id={peopleListId}>
        {knownPeople.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
        <Field
          id={`${idPrefix}-amount`}
          label="Amount"
          name="amount"
          defaultValue={initial.amount}
          inputMode="decimal"
          placeholder="0.00"
          autoComplete="off"
          required
        />
        <CurrencyCombobox
          label="Currency"
          name="currency"
          options={currencyOptions}
          defaultCode={initial.currency}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id={`${idPrefix}-incurred`}
          label="Date"
          name="incurredOn"
          type="date"
          defaultValue={initial.incurredOn}
          required
        />
        <Field
          id={`${idPrefix}-due`}
          label="Due date (optional)"
          name="dueOn"
          type="date"
          defaultValue={initial.dueOn}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SelectField
          id={`${idPrefix}-account`}
          label={ACCOUNT_LABEL[direction]}
          name="accountId"
          defaultValue={initial.accountId}
          options={[
            { value: "", label: "Not tracked in an account" },
            ...accounts.map((account) => ({
              value: account.id,
              label: `${account.name} · ${account.currency}`,
            })),
          ]}
        />
        <Field
          id={`${idPrefix}-note`}
          label="Note"
          name="note"
          defaultValue={initial.note}
          placeholder="Optional, e.g. what it was for"
          maxLength={UTANG_NOTE_MAX_LENGTH}
        />
      </div>
      <p className="text-xs text-muted">
        Choosing an account moves its balance: lending takes money out, borrowing brings it in.
        It never counts as income or spending.
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClassName("ghost")}>
          Cancel
        </button>
        <button type="submit" disabled={isPending} className={buttonClassName("primary")}>
          {isPending ? "Saving…" : SUBMIT_LABEL[mode]}
        </button>
      </div>
    </form>
  );
}
