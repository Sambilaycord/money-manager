import type { UtangBalance, UtangDirection } from "@money-manager/shared";

// Money coming back to the person fills in mint; money they are paying off,
// peach, matching the "owed to you" and "you owe" figures.
const DIRECTION_STYLE: Record<UtangDirection, { fill: string; track: string }> = {
  owed_to_me: { fill: "bg-mint-ink", track: "bg-mint" },
  i_owe: { fill: "bg-peach-ink", track: "bg-peach" },
};

/** How much has been paid back. Decorative: the paid figure is always written beside it. */
export function UtangMeter({
  balance,
  direction,
}: {
  balance: UtangBalance;
  direction: UtangDirection;
}) {
  const style = DIRECTION_STYLE[direction];
  return (
    <span aria-hidden="true" className={`block h-2 w-full overflow-hidden rounded-full ${style.track}`}>
      <span
        // The share paid is data, so the width is set inline.
        style={{ width: `${balance.ratio * 100}%` }}
        className={`block h-full rounded-full ${style.fill}`}
      />
    </span>
  );
}
