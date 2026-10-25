/** How much has been saved toward the price. Decorative: the amounts are always written beside it. */
export function WishlistMeter({ ratio }: { ratio: number }) {
  return (
    <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded-full bg-rose">
      <span
        // The share saved is data, so the width is set inline.
        style={{ width: `${ratio * 100}%` }}
        className="block h-full rounded-full bg-rose-ink"
      />
    </span>
  );
}
