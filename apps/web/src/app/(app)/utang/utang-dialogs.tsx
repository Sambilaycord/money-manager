"use client";

import {
  centsToAmountInput,
  formatDayWithYear,
  formatMoney,
  UTANG_DIRECTION_LABELS,
  UTANG_PAYMENT_NOTE_MAX_LENGTH,
  type UtangBalance,
  type UtangInput,
  type ValidUtang,
} from "@money-manager/shared";
import {
  startTransition,
  useActionState,
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { SetAsidePanel, type SetAsideView } from "@/components/set-aside-panel";
import { Alert } from "@/components/ui/alert";
import { buttonClassName, iconButtonClassName } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, SelectField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { MoneyAccountOption } from "@/lib/accounts";
import type { CurrencyOption } from "@/lib/currencies";
import type { UtangFormAction, UtangFormState } from "./actions";
import { UtangForm } from "./utang-form";
import { UtangMeter } from "./utang-meter";

interface FormOptions {
  currencyOptions: CurrencyOption[];
  knownPeople: string[];
  accounts: MoneyAccountOption[];
}

export function AddUtangDialog({
  initial,
  action,
  currencyOptions,
  knownPeople,
  accounts,
}: FormOptions & { initial: UtangInput; action: UtangFormAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={buttonClassName("primary")}>
        <PlusIcon width={18} height={18} />
        Add utang
      </button>
      <Modal open={isOpen} onClose={close} title="Add utang">
        <UtangForm
          mode="create"
          initial={initial}
          action={action}
          currencyOptions={currencyOptions}
          knownPeople={knownPeople}
          accounts={accounts}
          onSaved={close}
          onCancel={close}
        />
      </Modal>
    </>
  );
}

export interface UtangPaymentView {
  id: string;
  amountCents: number;
  paidOn: string;
  note: string | null;
}

/** Two-step, so a stray tap can't remove a payment. */
function RemovePaymentButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => Promise<UtangFormState>;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startRemove] = useTransition();

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        aria-label={`Remove ${label}`}
        className={iconButtonClassName}
      >
        <CloseIcon width={16} height={16} />
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startRemove(async () => {
            const result = await onRemove();
            if (result.error) setError(result.error);
          })
        }
        className={buttonClassName("ghost", "h-8 px-2.5 text-danger hover:text-danger")}
      >
        {isPending ? "Removing…" : "Remove"}
      </button>
      <button
        type="button"
        onClick={() => setIsConfirming(false)}
        className={buttonClassName("ghost", "h-8 px-2.5")}
      >
        Keep
      </button>
    </span>
  );
}

function PaymentForm({
  action,
  remainingCents,
  currency,
  today,
  accountLabel,
  accounts,
  defaultAccountId,
}: {
  action: UtangFormAction;
  remainingCents: number;
  currency: string;
  today: string;
  /** "Received into" or "Paid from", depending on who owes whom. */
  accountLabel: string;
  /** Accounts in the utang's currency. */
  accounts: MoneyAccountOption[];
  defaultAccountId: string;
}) {
  const [amount, setAmount] = useState("");
  const [state, dispatch, isPending] = useActionState<UtangFormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.saved) setAmount("");
      return next;
    },
    {},
  );
  const idPrefix = useId();

  // Submitted by hand so a failed save keeps what was typed (see UtangForm).
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-surface-sunken p-4">
      <h3 className="text-sm font-semibold">Record a payment</h3>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
        <div className="flex flex-col gap-1.5">
          <Field
            id={`${idPrefix}-amount`}
            label={`Amount (${currency})`}
            name="amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            required
          />
          <button
            type="button"
            onClick={() => setAmount(centsToAmountInput(remainingCents))}
            className="self-start rounded text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Full amount · {formatMoney(remainingCents, currency)}
          </button>
        </div>
        <Field
          id={`${idPrefix}-date`}
          label="Date"
          name="paidOn"
          type="date"
          defaultValue={today}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SelectField
          id={`${idPrefix}-account`}
          label={accountLabel}
          name="accountId"
          defaultValue={defaultAccountId}
          options={[
            { value: "", label: "Not tracked in an account" },
            ...accounts.map((account) => ({ value: account.id, label: account.name })),
          ]}
        />
        <Field
          id={`${idPrefix}-note`}
          label="Note"
          name="note"
          placeholder="Optional"
          maxLength={UTANG_PAYMENT_NOTE_MAX_LENGTH}
        />
      </div>
      <button type="submit" disabled={isPending} className={buttonClassName("primary", "self-end")}>
        {isPending ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export interface UtangView extends ValidUtang {
  id: string;
  accountName: string | null;
  payments: (UtangPaymentView & { accountName: string | null })[];
  balance: UtangBalance;
  setAsides: SetAsideView[];
}

// The account's role depends on who owes whom.
const ACCOUNT_LABELS = {
  owed_to_me: { principal: "Lent from", payment: "Received into" },
  i_owe: { principal: "Received into", payment: "Paid from" },
} as const;

interface UtangDetailDialogProps extends FormOptions {
  utang: UtangView;
  /** The edit form's starting values. */
  input: UtangInput;
  today: string;
  /** Bound to this utang's id by the page. */
  updateAction: UtangFormAction;
  deleteAction: () => Promise<UtangFormState>;
  addPaymentAction: UtangFormAction;
  deletePaymentAction: (paymentId: string) => Promise<UtangFormState>;
  /** Bound to this utang by the page; only used for utang the user owes. */
  setAsideAction: UtangFormAction;
  releaseAction: (setAsideId: string) => Promise<UtangFormState>;
  trigger: ReactNode;
  triggerClassName: string;
}

/** One utang in full: what's left, its payments, and the controls to change it. */
export function UtangDetailDialog({
  utang,
  input,
  today,
  updateAction,
  deleteAction,
  addPaymentAction,
  deletePaymentAction,
  setAsideAction,
  releaseAction,
  currencyOptions,
  knownPeople,
  accounts,
  trigger,
  triggerClassName,
}: UtangDetailDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const close = () => {
    setIsOpen(false);
    setIsEditing(false);
  };
  const { balance, currency } = utang;
  const labels = UTANG_DIRECTION_LABELS[utang.direction];
  const accountLabels = ACCOUNT_LABELS[utang.direction];
  const sameCurrencyAccounts = accounts.filter((account) => account.currency === currency);

  const deleteAndClose = async () => {
    const result = await deleteAction();
    if (result.saved) close();
    return result;
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={triggerClassName}>
        {trigger}
      </button>
      <Modal open={isOpen} onClose={close} title={isEditing ? "Edit utang" : utang.person}>
        {isEditing ? (
          <UtangForm
            mode="edit"
            initial={input}
            action={updateAction}
            currencyOptions={currencyOptions}
            knownPeople={knownPeople}
            accounts={accounts}
            onSaved={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm text-muted">
                {balance.isSettled ? `${labels.settledVerb} in full` : `${labels.heading} · still owed`}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {formatMoney(balance.isSettled ? utang.amountCents : balance.remainingCents, currency)}
              </p>
              <div className="mt-3">
                <UtangMeter balance={balance} direction={utang.direction} />
              </div>
              <p className="mt-2 text-xs text-muted tabular-nums">
                {formatMoney(balance.paidCents, currency)} of {formatMoney(utang.amountCents, currency)}{" "}
                paid back
              </p>
            </div>

            <dl className="divide-y divide-border border-y border-border">
              <DetailRow label="Since">{formatDayWithYear(utang.incurredOn)}</DetailRow>
              <DetailRow label="Due">
                {utang.dueOn ? (
                  <span className={balance.isOverdue ? "text-danger" : undefined}>
                    {formatDayWithYear(utang.dueOn)}
                    {balance.isOverdue && " · overdue"}
                  </span>
                ) : (
                  <span className="font-normal text-muted">No due date</span>
                )}
              </DetailRow>
              <DetailRow label={accountLabels.principal}>
                {utang.accountName ?? <span className="font-normal text-muted">Not tracked</span>}
              </DetailRow>
              {utang.note && <DetailRow label="Note">{utang.note}</DetailRow>}
            </dl>

            {!balance.isSettled && utang.direction === "i_owe" && (
              <SetAsidePanel
                title="Set aside to pay back"
                description="Keep money in an account for this, so it isn't counted as free to spend. Paying from that account uses it up."
                currency={currency}
                setAsides={utang.setAsides}
                accounts={accounts}
                setAsideAction={setAsideAction}
                releaseAction={releaseAction}
              />
            )}

            {!balance.isSettled && (
              <PaymentForm
                action={addPaymentAction}
                remainingCents={balance.remainingCents}
                currency={currency}
                today={today}
                accountLabel={accountLabels.payment}
                accounts={sameCurrencyAccounts}
                defaultAccountId={utang.accountId ?? ""}
              />
            )}

            <section aria-labelledby={`payments-${utang.id}`}>
              <h3 id={`payments-${utang.id}`} className="mb-1 text-sm font-semibold">
                Payments
              </h3>
              {utang.payments.length === 0 ? (
                <p className="text-sm text-muted">Nothing paid back yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {utang.payments.map((payment) => {
                    const amount = formatMoney(payment.amountCents, currency);
                    const date = formatDayWithYear(payment.paidOn);
                    return (
                      <li key={payment.id} className="flex items-center gap-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium tabular-nums">{amount}</span>
                          <span className="block truncate text-xs text-muted">
                            {date}
                            {payment.accountName && ` · ${payment.accountName}`}
                            {payment.note && ` · ${payment.note}`}
                          </span>
                        </span>
                        <RemovePaymentButton
                          label={`payment of ${amount} on ${date}`}
                          onRemove={() => deletePaymentAction(payment.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border pt-4">
              <DeleteButton onDelete={deleteAndClose} />
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={buttonClassName("secondary")}
              >
                Edit details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
