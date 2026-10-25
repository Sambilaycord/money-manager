import {
  formatDayWithYear,
  formatMoney,
  UTANG_DIRECTION_LABELS,
  utangToInput,
} from "@money-manager/shared";
import { Avatar } from "@/components/app/avatar";
import type { MoneyAccountOption } from "@/lib/accounts";
import { listCurrencyOptions } from "@/lib/currencies";
import type { UtangWithPayments } from "@/lib/utang";
import { releaseSetAside, setAsideMoney } from "../set-aside-actions";
import { addUtangPayment, deleteUtang, deleteUtangPayment, updateUtang } from "./actions";
import { UtangDetailDialog } from "./utang-dialogs";
import { UtangMeter } from "./utang-meter";

function UtangStatus({ utang }: { utang: UtangWithPayments }) {
  const { balance } = utang;
  if (balance.isSettled) {
    // Names the direction, since a settled list mixes both kinds.
    const verb = UTANG_DIRECTION_LABELS[utang.direction].settledVerb;
    return <span>{utang.settledOn ? `${verb} ${formatDayWithYear(utang.settledOn)}` : verb}</span>;
  }
  if (balance.isOverdue && utang.dueOn) {
    return (
      <span className="font-medium text-danger">Overdue · {formatDayWithYear(utang.dueOn)}</span>
    );
  }
  if (utang.dueOn) return <span>Due {formatDayWithYear(utang.dueOn)}</span>;
  return null;
}

/** One utang as a clickable row; shared by the utang page and its full lists. */
export function UtangRow({
  utang,
  today,
  knownPeople,
  accounts,
}: {
  utang: UtangWithPayments;
  today: string;
  knownPeople: string[];
  accounts: MoneyAccountOption[];
}) {
  const { balance, currency } = utang;
  const shownCents = balance.isSettled ? utang.amountCents : balance.remainingCents;
  return (
    <li>
      <UtangDetailDialog
        utang={utang}
        input={utangToInput(utang)}
        today={today}
        updateAction={updateUtang.bind(null, utang.id)}
        deleteAction={deleteUtang.bind(null, utang.id)}
        addPaymentAction={addUtangPayment.bind(null, utang.id)}
        deletePaymentAction={deleteUtangPayment}
        setAsideAction={setAsideMoney.bind(null, { utangId: utang.id })}
        releaseAction={releaseSetAside}
        accounts={accounts}
        currencyOptions={listCurrencyOptions()}
        knownPeople={knownPeople}
        triggerClassName="flex h-full w-full items-center rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary"
        trigger={
          <span className="flex w-full min-w-0 items-start gap-3">
            <Avatar name={utang.person} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium">{utang.person}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(shownCents, currency)}
                </span>
              </span>
              <span className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-muted">
                <span className="truncate">
                  {utang.note ?? `Since ${formatDayWithYear(utang.incurredOn)}`}
                </span>
                <span className="shrink-0">
                  <UtangStatus utang={utang} />
                </span>
              </span>
              {/* Shown even before any payment, so every open row is the same
                  height and a fixed-height column never jumps between pages. */}
              {!balance.isSettled && (
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <UtangMeter balance={balance} direction={utang.direction} />
                  </span>
                  <span className="shrink-0 text-[11px] leading-none text-muted tabular-nums">
                    of {formatMoney(utang.amountCents, currency)}
                  </span>
                </span>
              )}
            </span>
          </span>
        }
      />
    </li>
  );
}
