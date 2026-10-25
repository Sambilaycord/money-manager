"use client";

import {
  isWishlistPriority,
  WISHLIST_NAME_MAX_LENGTH,
  WISHLIST_NOTE_MAX_LENGTH,
  WISHLIST_PRIORITIES,
  WISHLIST_PRIORITY_LABELS,
  WISHLIST_URL_MAX_LENGTH,
  type WishlistInput,
  type WishlistPriority,
} from "@money-manager/shared";
import { startTransition, useActionState, useId, useState, type FormEvent } from "react";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CurrencyOption } from "@/lib/currencies";
import type { WishlistFormAction, WishlistFormState } from "./actions";

export type WishlistFormMode = "create" | "edit";

const SUBMIT_LABEL: Record<WishlistFormMode, string> = {
  create: "Add to wishlist",
  edit: "Save changes",
};

function PriorityPicker({
  value,
  onChange,
}: {
  value: WishlistPriority;
  onChange: (priority: WishlistPriority) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">How much do you want it?</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-sunken p-1">
        {WISHLIST_PRIORITIES.map((priority) => (
          <label
            key={priority}
            className="cursor-pointer rounded-lg px-1.5 py-2 text-center text-xs font-medium whitespace-nowrap text-muted sm:px-2 sm:text-sm has-checked:bg-surface has-checked:text-foreground has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-primary"
          >
            <input
              type="radio"
              name="priority"
              value={priority}
              checked={value === priority}
              onChange={() => onChange(priority)}
              className="sr-only"
            />
            {WISHLIST_PRIORITY_LABELS[priority]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface WishlistFormProps {
  mode: WishlistFormMode;
  initial: WishlistInput;
  action: WishlistFormAction;
  currencyOptions: CurrencyOption[];
  onSaved: () => void;
  onCancel: () => void;
}

export function WishlistForm({
  mode,
  initial,
  action,
  currencyOptions,
  onSaved,
  onCancel,
}: WishlistFormProps) {
  const [state, dispatch, isPending] = useActionState<WishlistFormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.saved) onSaved();
      return next;
    },
    {},
  );
  const [name, setName] = useState(initial.name);
  const [priority, setPriority] = useState<WishlistPriority>(
    isWishlistPriority(initial.priority) ? initial.priority : "medium",
  );
  // Every card can open its own copy of this form.
  const idPrefix = useId();

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
      <Field
        id={`${idPrefix}-name`}
        label="What do you want?"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Nintendo Switch 2, new running shoes"
        characterLimit={WISHLIST_NAME_MAX_LENGTH}
        required
      />
      <Field
        id={`${idPrefix}-url`}
        label="Link (optional)"
        name="url"
        defaultValue={initial.url}
        inputMode="url"
        placeholder="e.g. shopee.ph/your-item"
        maxLength={WISHLIST_URL_MAX_LENGTH}
        autoComplete="off"
      />
      {/* minmax(0, …) lets the columns shrink below a text box's default
          width; plain 1fr columns refused to and pushed fields out of the dialog. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field
          id={`${idPrefix}-price`}
          label="Price (optional)"
          name="price"
          defaultValue={initial.price}
          inputMode="decimal"
          placeholder="0.00"
          autoComplete="off"
        />
        <CurrencyCombobox
          label="Currency"
          name="currency"
          options={currencyOptions}
          defaultCode={initial.currency}
        />
      </div>
      <PriorityPicker value={priority} onChange={setPriority} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field
          id={`${idPrefix}-want-by`}
          label="Want it by (optional)"
          name="wantBy"
          type="date"
          defaultValue={initial.wantBy}
        />
        <Field
          id={`${idPrefix}-note`}
          label="Note"
          name="note"
          defaultValue={initial.note}
          placeholder="Optional, e.g. color or size"
          maxLength={WISHLIST_NOTE_MAX_LENGTH}
        />
      </div>
      <p className="text-xs text-muted">
        To save toward it, open the item after adding it and set money aside from an account.
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
