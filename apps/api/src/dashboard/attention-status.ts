export type PassportAttentionStatus = 'EXPIRED' | 'URGENT' | 'UPCOMING' | 'OK';
export type TaskAttentionStatus = 'OVERDUE' | 'DUE_SOON' | 'OK';

const DAY_MS = 86_400_000;
const DEFAULT_TIME_ZONE = 'Asia/Bangkok';

function startOfTimeZoneDay(value: Date, timeZone: string) {
  let formatted: Intl.DateTimeFormatPart[];
  try {
    formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
  } catch {
    return startOfTimeZoneDay(value, DEFAULT_TIME_ZONE);
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(formatted.find((part) => part.type === type)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'));
}

function dateValue(value: string) {
  return Date.parse(`${value}T00:00:00.000Z`);
}

export function passportAttentionStatus(
  expiryDate: string | null,
  now: Date,
  timeZone = DEFAULT_TIME_ZONE,
): PassportAttentionStatus {
  if (!expiryDate) return 'OK';
  const days = Math.round(
    (dateValue(expiryDate) - startOfTimeZoneDay(now, timeZone)) / DAY_MS,
  );
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'URGENT';
  if (days <= 90) return 'UPCOMING';
  return 'OK';
}

export function taskAttentionStatus(
  dueDate: string | null,
  status: string,
  now: Date,
  timeZone = DEFAULT_TIME_ZONE,
): TaskAttentionStatus {
  if (!dueDate || status === 'COMPLETED') return 'OK';
  const days = Math.round(
    (dateValue(dueDate) - startOfTimeZoneDay(now, timeZone)) / DAY_MS,
  );
  if (days < 0) return 'OVERDUE';
  if (days <= 7) return 'DUE_SOON';
  return 'OK';
}
