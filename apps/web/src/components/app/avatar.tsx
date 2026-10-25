export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const SIZE_CLASS = {
  md: "size-9 rounded-xl text-sm",
  lg: "size-14 rounded-2xl text-lg",
  xl: "size-20 rounded-3xl text-2xl",
} as const;

export type AvatarSize = keyof typeof SIZE_CLASS;

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  /** The person's picture; initials stand in when there isn't one. */
  imageUrl?: string | null;
}

/** Decorative: the person's name always appears beside it or in its label. */
export function Avatar({ name, size = "md", imageUrl }: AvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  if (imageUrl) {
    return (
      // A plain <img>: the URL is a short-lived signed link to a private
      // bucket, so next/image's optimiser would only cache links that expire.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" aria-hidden="true" className={`shrink-0 object-cover ${sizeClass}`} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-linear-to-br from-sky to-cloud font-semibold text-sky-ink ${sizeClass}`}
    >
      {initialsOf(name)}
    </span>
  );
}
