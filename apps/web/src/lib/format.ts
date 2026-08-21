export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export const defaultDateFormat: DateFormat = "DD/MM/YYYY";
export const defaultTimeZone = "Asia/Bangkok";

type CalendarParts = { year: string; month: string; day: string };

/** Invalid or stale stored values must not break every page in the shell. */
export function normalizeTimeZone(timeZone?: string | null): string {
  const candidate = timeZone || defaultTimeZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return defaultTimeZone;
  }
}

/**
 * Date-only values are calendar facts and never pass through a timezone.
 * Timestamps are converted to the configured workspace calendar day.
 */
function parts(
  value: string,
  timeZone: string = defaultTimeZone,
): CalendarParts | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return { year: dateOnly[1], month: dateOnly[2], day: dateOnly[3] };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    formatted.find((part) => part.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return year && month && day ? { year, month, day } : null;
}

/** Formats a stored date using both workspace date and timezone settings. */
export function formatDate(
  value: string | null | undefined,
  format: DateFormat | string = defaultDateFormat,
  fallback = "—",
  timeZone: string = defaultTimeZone,
): string {
  if (!value) return fallback;
  const date = parts(value, timeZone);
  if (!date) return fallback;
  if (format === "YYYY-MM-DD") return `${date.year}-${date.month}-${date.day}`;
  if (format === "MM/DD/YYYY") return `${date.month}/${date.day}/${date.year}`;
  return `${date.day}/${date.month}/${date.year}`;
}

/** Calendar day for an instant in the configured workspace timezone. */
export function calendarDayInTimeZone(
  value: Date = new Date(),
  timeZone: string = defaultTimeZone,
): string {
  const date = parts(value.toISOString(), timeZone);
  return date ? `${date.year}-${date.month}-${date.day}` : "";
}

/** Adds whole calendar days without relying on the browser's local timezone. */
export function addCalendarDays(value: string, days: number): string {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!date) return value;
  const next = new Date(
    Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]) + days),
  );
  return next.toISOString().slice(0, 10);
}

/** Hour of an instant in the configured workspace timezone. */
export function hourInTimeZone(
  timeZone: string = defaultTimeZone,
  value: Date = new Date(),
): number {
  const part = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizeTimeZone(timeZone),
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(value)
    .find((item) => item.type === "hour")?.value;
  return Number(part ?? 0);
}

export type DueState = "none" | "overdue" | "today" | "soon" | "later";

/** Whole calendar days from the workspace's current day to a stored date. */
export function daysUntil(
  value: string | null | undefined,
  timeZone: string = defaultTimeZone,
  now: Date = new Date(),
): number | null {
  if (!value) return null;
  const date = parts(value, timeZone);
  const today = parts(now.toISOString(), timeZone);
  if (!date || !today) return null;
  const ordinal = (item: CalendarParts) =>
    Date.UTC(Number(item.year), Number(item.month) - 1, Number(item.day));
  return Math.round((ordinal(date) - ordinal(today)) / 86_400_000);
}

/** The due-soon window matches GET /dashboard/attention. */
export function dueState(
  value: string | null | undefined,
  timeZone: string = defaultTimeZone,
  now: Date = new Date(),
): DueState {
  const days = daysUntil(value, timeZone, now);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "later";
}

/** Short plain-language note shown next to an urgent due date. */
export function dueLabel(
  value: string | null | undefined,
  timeZone: string = defaultTimeZone,
  now: Date = new Date(),
): string {
  const days = daysUntil(value, timeZone, now);
  if (days === null) return "";
  if (days < 0) return days === -1 ? "1 day overdue" : `${-days} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `In ${days} days`;
  return "";
}
