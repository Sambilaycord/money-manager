/** Warn this close to the limit, so people can trim before they hit it. */
const NEAR_LIMIT_RATIO = 0.9;

interface CharacterCountProps {
  /** Omit when a wrapper (e.g. Headless UI Description) supplies the id. */
  id?: string;
  length: number;
  limit: number;
}

/**
 * "12 / 80" under a text field. Browsers silently cut a paste at maxLength,
 * so without this a long pasted name loses its end with no sign anything
 * happened.
 */
export function CharacterCount({ id, length, limit }: CharacterCountProps) {
  const tone =
    length >= limit ? "text-danger" : length >= limit * NEAR_LIMIT_RATIO ? "text-butter-ink" : "text-muted";
  return (
    <p id={id} className={`text-right text-xs tabular-nums ${tone}`}>
      <span aria-hidden="true">
        {length} / {limit}
      </span>
      <span className="sr-only">
        {length} of {limit} characters used
        {length >= limit && ", limit reached"}
      </span>
    </p>
  );
}
