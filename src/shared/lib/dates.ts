// Instants arrive in UTC (ISO 8601). They are always shown in the barbershop's time zone,
// never in the phone's.

const LOCALE = 'es-PE';

function format(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, ...options }).format(new Date(iso));
}

/** "14:30" */
export const formatTime = (iso: string, timeZone: string) =>
  format(iso, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** "lun, 7 ene" */
export const formatShortDate = (iso: string, timeZone: string) =>
  format(iso, timeZone, { weekday: 'short', day: 'numeric', month: 'short' });

/** "lunes, 7 de enero de 2030" */
export const formatLongDate = (iso: string, timeZone: string) =>
  format(iso, timeZone, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Calendar day (YYYY-MM-DD) of an instant in the given zone, as the API expects in `date=`. */
export function toLocalDate(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * The next `count` calendar days in a time zone, starting today there. Pure calendar arithmetic on
 * dates (not instants), so it never drifts with the phone's zone.
 */
export function upcomingDays(
  timeZone: string,
  count: number,
  now: Date = new Date(),
): { date: string; dayOfWeek: number; dayOfMonth: number }[] {
  const [year, month, day] = toLocalDate(now.toISOString(), timeZone).split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1, day + i));
    return {
      date: date.toISOString().slice(0, 10),
      dayOfWeek: date.getUTCDay(),
      dayOfMonth: date.getUTCDate(),
    };
  });
}

/** Day of week (0 = Sunday) of an instant in a time zone, to highlight "today" in business hours. */
export function dayOfWeekIn(timeZone: string, now: Date = new Date()): number {
  const [year, month, day] = toLocalDate(now.toISOString(), timeZone).split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Offset (minutes) of a time zone at an instant: local wall time minus UTC. */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * ISO instant of a calendar day and wall time ("HH:MM") in a barbershop's zone, as the API
 * expects for time blocks. Time arithmetic only; no business rule.
 */
export function zonedTimeToIso(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes handle zones whose offset changes around that moment.
  let instant = guess - zoneOffsetMinutes(new Date(guess), timeZone) * 60000;
  instant = guess - zoneOffsetMinutes(new Date(instant), timeZone) * 60000;
  return new Date(instant).toISOString();
}
