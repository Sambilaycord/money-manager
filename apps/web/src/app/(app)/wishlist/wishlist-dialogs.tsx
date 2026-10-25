"use client";

import {
  centsToAmountInput,
  formatDayWithYear,
  formatMoney,
  linkLabel,
  WISHLIST_PRIORITY_LABELS,
  wishlistProgress,
  type ValidWishlistItem,
  type WishlistInput,
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
import { ExternalLinkIcon, PlusIcon } from "@/components/icons";
import { SetAsidePanel, type SetAsideView } from "@/components/set-aside-panel";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, SelectField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { MoneyAccountOption } from "@/lib/accounts";
import type { CurrencyOption } from "@/lib/currencies";
import type { WishlistFormAction, WishlistFormState } from "./actions";
import { WishlistForm } from "./wishlist-form";
import { WishlistMeter } from "./wishlist-meter";

export function AddWishlistDialog({
  initial,
  action,
  currencyOptions,
}: {
  initial: WishlistInput;
  action: WishlistFormAction;
  currencyOptions: CurrencyOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={buttonClassName("primary")}>
        <PlusIcon width={18} height={18} />
        Add item
      </button>
      <Modal open={isOpen} onClose={close} title="Add to wishlist">
        <WishlistForm
          mode="create"
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

/** A link to the item's shop page, opened in a new tab. */
export function ShopLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      // noopener: the shop's page can't reach back into this one.
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface-sunken px-2 py-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span className="truncate">{linkLabel(url)}</span>
      <ExternalLinkIcon width={12} height={12} className="shrink-0" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export interface CategoryOption {
  id: string;
  name: string;
}

/** Records the purchase: an expense from the chosen account, releasing the set-aside money. */
function PurchaseForm({
  item,
  accounts,
  categories,
  today,
  action,
  onCancel,
  onBought,
}: {
  item: WishlistItemView;
  accounts: MoneyAccountOption[];
  categories: CategoryOption[];
  today: string;
  action: WishlistFormAction;
  onCancel: () => void;
  onBought: () => void;
}) {
  // Any account in the item's currency can pay, cards included.
  const payable = accounts.filter((account) => account.currency === item.currency);
  // Default to the account holding the most set aside for this item.
  const fundedFrom = [...item.setAsides].sort((a, b) => b.amountCents - a.amountCents)[0]?.accountId;
  const [state, dispatch, isPending] = useActionState<WishlistFormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.saved) onBought();
      return next;
    },
    {},
  );
  const idPrefix = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  if (payable.length === 0) {
    return (
      <Alert tone="info">
        Add an account in {item.currency} first, so the purchase has somewhere to come from.
      </Alert>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-surface-sunken p-4">
      <div>
        <h3 className="text-sm font-semibold">Record the purchase</h3>
        <p className="mt-0.5 text-xs text-muted">
          Saved as an expense from the account you choose. Money set aside for this item is released.
        </p>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SelectField
          id={`${idPrefix}-account`}
          label="Paid from"
          name="accountId"
          defaultValue={fundedFrom ?? payable[0]?.id}
          options={payable.map((account) => ({ value: account.id, label: account.name }))}
        />
        <Field
          id={`${idPrefix}-amount`}
          label={`Amount paid (${item.currency})`}
          name="amount"
          defaultValue={item.priceCents === null ? "" : centsToAmountInput(item.priceCents)}
          inputMode="decimal"
          placeholder="0.00"
          autoComplete="off"
          required
        />
        <Field
          id={`${idPrefix}-date`}
          label="Date"
          name="boughtOn"
          type="date"
          defaultValue={today}
          required
        />
        <SelectField
          id={`${idPrefix}-category`}
          label="Category"
          name="categoryId"
          defaultValue=""
          options={[
            { value: "", label: "Uncategorised" },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClassName("ghost")}>
          Cancel
        </button>
        <button type="submit" disabled={isPending} className={buttonClassName("primary")}>
          {isPending ? "Recording…" : "Record purchase"}
        </button>
      </div>
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

export interface WishlistItemView extends ValidWishlistItem {
  id: string;
  boughtOn: string | null;
  setAsides: (SetAsideView & { accountId: string })[];
  savedCents: number;
}

interface WishlistDetailDialogProps {
  item: WishlistItemView;
  /** The edit form's starting values. */
  input: WishlistInput;
  today: string;
  currencyOptions: CurrencyOption[];
  accounts: MoneyAccountOption[];
  expenseCategories: CategoryOption[];
  /** Bound to this item's id (or purpose) by the page. */
  updateAction: WishlistFormAction;
  buyAction: WishlistFormAction;
  unbuyAction: () => Promise<WishlistFormState>;
  deleteAction: () => Promise<WishlistFormState>;
  setAsideAction: WishlistFormAction;
  releaseAction: (setAsideId: string) => Promise<WishlistFormState>;
  /** Accessible name for the invisible button that covers the card. */
  triggerLabel: string;
  triggerClassName: string;
}

type View = "details" | "edit" | "buy";

/** One item in full: money set aside for it, its link, and the controls to change it. */
export function WishlistDetailDialog({
  item,
  input,
  today,
  currencyOptions,
  accounts,
  expenseCategories,
  updateAction,
  buyAction,
  unbuyAction,
  deleteAction,
  setAsideAction,
  releaseAction,
  triggerLabel,
  triggerClassName,
}: WishlistDetailDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>("details");
  const [unbuyError, setUnbuyError] = useState<string | null>(null);
  const [isUnbuying, startUnbuy] = useTransition();
  const close = () => {
    setIsOpen(false);
    setView("details");
    setUnbuyError(null);
  };
  const progress = wishlistProgress(item);
  const isBought = item.boughtOn !== null;

  // The item moves between the Wanted and Bought lists, so its dialog closes
  // rather than lingering over the list it left.
  const unbuy = () =>
    startUnbuy(async () => {
      const result = await unbuyAction();
      if (result.error) setUnbuyError(result.error);
      else close();
    });

  const deleteAndClose = async () => {
    const result = await deleteAction();
    if (result.saved) close();
    return result;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={triggerLabel}
        className={triggerClassName}
      />
      <Modal open={isOpen} onClose={close} title={view === "edit" ? "Edit item" : item.name}>
        {view === "edit" ? (
          <WishlistForm
            mode="edit"
            initial={input}
            action={updateAction}
            currencyOptions={currencyOptions}
            onSaved={() => setView("details")}
            onCancel={() => setView("details")}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              {item.priceCents === null ? (
                <p className="text-sm text-muted">No price yet</p>
              ) : (
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(item.priceCents, item.currency)}
                </p>
              )}
              {!isBought && progress.ratio !== null && (
                <>
                  <div className="mt-3">
                    <WishlistMeter ratio={progress.ratio} />
                  </div>
                  <p className="mt-2 text-xs text-muted tabular-nums">
                    {formatMoney(item.savedCents, item.currency)} set aside
                    {progress.isFullySaved
                      ? " · fully covered"
                      : ` · ${formatMoney(progress.remainingCents ?? 0, item.currency)} to go`}
                  </p>
                </>
              )}
              {item.url && (
                <div className="mt-4">
                  <ShopLink url={item.url} />
                </div>
              )}
            </div>

            <dl className="divide-y divide-border border-y border-border">
              <DetailRow label="Priority">{WISHLIST_PRIORITY_LABELS[item.priority]}</DetailRow>
              {item.wantBy && <DetailRow label="Want it by">{formatDayWithYear(item.wantBy)}</DetailRow>}
              {item.boughtOn && <DetailRow label="Bought">{formatDayWithYear(item.boughtOn)}</DetailRow>}
              {item.note && <DetailRow label="Note">{item.note}</DetailRow>}
            </dl>

            {view === "buy" ? (
              <PurchaseForm
                item={item}
                accounts={accounts}
                categories={expenseCategories}
                today={today}
                action={buyAction}
                onCancel={() => setView("details")}
                onBought={close}
              />
            ) : (
              !isBought && (
                <SetAsidePanel
                  title="Set aside for this"
                  description="Keep money in an account for this item, so it isn't counted as free to spend."
                  currency={item.currency}
                  setAsides={item.setAsides}
                  accounts={accounts}
                  setAsideAction={setAsideAction}
                  releaseAction={releaseAction}
                />
              )
            )}

            {unbuyError && <Alert tone="error">{unbuyError}</Alert>}
            {view === "details" && (
              <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border pt-4">
                <DeleteButton onDelete={deleteAndClose} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setView("edit")}
                    className={buttonClassName("secondary")}
                  >
                    Edit
                  </button>
                  {isBought ? (
                    <button
                      type="button"
                      disabled={isUnbuying}
                      onClick={unbuy}
                      title="Also removes the expense recorded for it"
                      className={buttonClassName("secondary")}
                    >
                      {isUnbuying ? "Moving…" : "Move back to wishlist"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setView("buy")}
                      className={buttonClassName("primary")}
                    >
                      Mark as bought
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
