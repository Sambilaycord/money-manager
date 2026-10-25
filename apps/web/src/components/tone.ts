export type PastelTone = "cloud" | "mint" | "peach" | "sky" | "butter" | "rose";

/** A pastel fill with its matching ink, so text on it always meets contrast. */
export const toneClassName: Record<PastelTone, string> = {
  cloud: "bg-cloud text-cloud-ink",
  mint: "bg-mint text-mint-ink",
  peach: "bg-peach text-peach-ink",
  sky: "bg-sky text-sky-ink",
  butter: "bg-butter text-butter-ink",
  rose: "bg-rose text-rose-ink",
};
