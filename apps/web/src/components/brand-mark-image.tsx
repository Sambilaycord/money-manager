import { MARK_COLORS, MARK_LEAF_LEFT, MARK_LEAF_RIGHT, MARK_STEM } from "@/lib/brand-mark";

/** The sprout in fixed colours, for images rendered outside the page (next/og). */
export function BrandMarkImage({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={MARK_STEM} stroke={MARK_COLORS.outline} strokeWidth={2.25} />
      <path d={MARK_LEAF_RIGHT} fill={MARK_COLORS.leafRight} stroke={MARK_COLORS.outline} strokeWidth={1.75} />
      <path d={MARK_LEAF_LEFT} fill={MARK_COLORS.leafLeft} stroke={MARK_COLORS.outline} strokeWidth={1.75} />
    </svg>
  );
}
