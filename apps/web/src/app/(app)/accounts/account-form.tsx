"use client";

import {
  ACCOUNT_COLOR_PALETTE,
  ACCOUNT_NAME_MAX_LENGTH,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  accountColorOrDefault,
  brandForAccount,
  isAccountType,
  isLiabilityAccount,
  type AccountInput,
  type AccountType,
} from "@money-manager/shared";
import { startTransition, useActionState, useId, useState, type FormEvent } from "react";
import { ColorSwatchPicker, type SwatchGroup } from "@/components/color-swatch-picker";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { InstitutionCombobox } from "@/components/institution-combobox";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import type { CurrencyOption } from "@/lib/currencies";
import type { AccountFormAction, AccountFormState } from "./actions";

export type AccountFormMode = "create" | "edit";

const SUBMIT_LABEL: Record<AccountFormMode, string> = {
  create: "Add account",
  edit: "Save changes",
};

// When editing, the field sets the opening balance; the current balance is
// derived from it plus transactions, so calling it "current" would mislead.
const BALANCE_LABEL: Record<AccountFormMode, { held: string; owed: string }> = {
  create: { held: "Current balance", owed: "Amount owed" },
  edit: { held: "Starting balance", owed: "Starting amount owed" },
};

const TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({
  value: type,
  label: ACCOUNT_TYPE_LABELS[type].singular,
}));

/**
 * The card colour. Until the person picks one it follows the account's brand
 * (bank field first, then name), so choosing "GoTyme" offers and preselects
 * GoTyme's colours; with no brand, the type's default is used.
 */
function useAccountColor(
  account: { name: string; institution: string | null; type: AccountType },
  initialColor: string | null,
) {
  const [pickedColor, setPickedColor] = useState<string | null>(initialColor);
  const brand = brandForAccount(account);

  // Each colour appears once, so two radios never share a value.
  const colorGroups: SwatchGroup[] = brand
    ? [
        { label: `${brand.name} colours`, swatches: brand.colors },
        {
          label: "Other colours",
          swatches: ACCOUNT_COLOR_PALETTE.filter(
            (swatch) => !brand.colors.some((brandSwatch) => brandSwatch.hex === swatch.hex),
          ),
        },
      ]
    : [{ label: "Colours", swatches: ACCOUNT_COLOR_PALETTE }];

  // A brand colour picked earlier disappears if the account stops matching
  // that brand; fall back rather than submit a colour the person can't see.
  const isVisible = colorGroups.some((group) =>
    group.swatches.some((swatch) => swatch.hex === pickedColor),
  );
  const suggested = brand?.colors[0]?.hex ?? accountColorOrDefault(null, account.type);
  const color = pickedColor && isVisible ? pickedColor : suggested;

  return { colorGroups, color, setPickedColor };
}

interface AccountFormProps {
  initial: AccountInput;
  currencyOptions: CurrencyOption[];
  action: AccountFormAction;
  mode: AccountFormMode;
  onSaved: () => void;
  onCancel: () => void;
}

export function AccountForm({
  initial,
  currencyOptions,
  action,
  mode,
  onSaved,
  onCancel,
}: AccountFormProps) {
  const [state, dispatch, isPending] = useActionState<AccountFormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.saved) onSaved();
      return next;
    },
    {},
  );
  const [name, setName] = useState(initial.name);
  const [institution, setInstitution] = useState<string | null>(initial.institution || null);
  const [type, setType] = useState<AccountType>(isAccountType(initial.type) ? initial.type : "bank");
  const owesMoney = isLiabilityAccount(type);
  const { colorGroups, color, setPickedColor } = useAccountColor(
    { name, institution, type },
    initial.color || null,
  );
  // The page can hold two copies of this form (header and empty state), so
  // every id is scoped to the instance.
  const idPrefix = useId();

  // Submitted by hand rather than through <form action>: React resets a form
  // after every action, which wipes what the person typed whenever validation
  // fails, and blanks the comboboxes, whose text React doesn't own.
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
        label="Name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Taiwan Trip Savings, Daily wallet"
        characterLimit={ACCOUNT_NAME_MAX_LENGTH}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InstitutionCombobox
          label="Bank or e-wallet"
          name="institution"
          value={institution}
          onChange={setInstitution}
        />
        <SelectField
          id={`${idPrefix}-type`}
          label="Type"
          name="type"
          options={TYPE_OPTIONS}
          value={type}
          onChange={(event) => {
            if (isAccountType(event.target.value)) setType(event.target.value);
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[9rem_1fr]">
        <CurrencyCombobox
          label="Currency"
          name="currency"
          options={currencyOptions}
          defaultCode={initial.currency}
        />
        <Field
          id={`${idPrefix}-balance`}
          label={owesMoney ? BALANCE_LABEL[mode].owed : BALANCE_LABEL[mode].held}
          name="balance"
          defaultValue={initial.balance}
          inputMode="decimal"
          placeholder="0.00"
        />
      </div>
      <ColorSwatchPicker
        name="color"
        legend="Card colour"
        groups={colorGroups}
        value={color}
        onChange={setPickedColor}
      />
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
