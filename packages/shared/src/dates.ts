// Transactions carry a calendar date (YYYY-MM-DD) with no time zone, and
// months are YYYY-MM. Everything here works on those strings and on UTC dates
// built from them, so a viewer's own time zone can never shift a day.

/**
 * The app is for people in the Philippines, so "today" and "this month" follow
 * their calendar rather than the server's, which runs in UTC.
 */
export const HOME_TIME_ZONE = "Asia/Manila";

// Date inputs accept six-digit years, so a slipped key turns 2026 into 20266.
// The bounds catch that and "0026" without limiting any real record.
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function isYearInRange(year: number): boolean {
  return year >= MIN_YEAR && year <= MAX_YEAR;
}

/** A YYYY-MM-DD date that exists: 2026-02-30 is rejected. */
export function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    isYearInRange(year) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** A YYYY-MM month. */
export function isMonth(value: string): boolean {
  const match = MONTH_PATTERN.exec(value);
  return match !== null && isYearInRange(Number(match[1]));
}

/** The calendar date it is right now in `timeZone`, as YYYY-MM-DD. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** "2026-10-23" → "2026-10". */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

function monthStart(month: string): Date {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1));
}

function toMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** First and last calendar dates of a YYYY-MM month, inclusive. */
export function monthRange(month: string): { start: string; end: string } {
  const start = monthStart(month);
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return { start: `${month}-01`, end: `${month}-${String(lastDay.getUTCDate()).padStart(2, "0")}` };
}

/** The month `delta` months before (negative) or after (positive) `month`. */
export function shiftMonth(month: string, delta: number): string {
  const start = monthStart(month);
  return toMonth(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1)));
}

/** "2026-10" → "October 2026". */
export function formatMonthLabel(month: string, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    monthStart(month),
  );
}

/** "2026-10" → "Oct". */
export function formatMonthShort(month: string, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(monthStart(month));
}

/** The `count` months ending with `month`, oldest first. */
export function monthsEndingWith(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(month, index - count + 1));
}

function dateStart(date: string): Date {
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
}

/** The calendar date `days` days before (negative) or after (positive) `date`. */
export function shiftDate(date: string, days: number): string {
  const shifted = dateStart(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** "2026-10-05" → "5 Oct". */
export function formatDayShort(date: string, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(
    dateStart(date),
  );
}
