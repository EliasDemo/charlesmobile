// Display-only formatters: they turn API values into text and never compute business data.

const LOCALE = 'es-PE';

/** "350 m" or "1,2 km" from `distanceMeters` as the API sends it. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}

/** "45 min" or "1 h 15 min" from `durationMinutes`. */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "4,5" from a rating average. */
export function formatRating(average: number): string {
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    average,
  );
}

/** Initials for placeholders until the gallery exists ("Barbería Demo" → "BD"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = (words.length > 1 ? [words[0], words[words.length - 1]] : words).map((w) => w![0] ?? '');
  return letters.join('').toUpperCase();
}
