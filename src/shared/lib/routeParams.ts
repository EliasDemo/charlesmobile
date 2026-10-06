/** First value of a route param (expo-router gives string | string[] | undefined). */
export function paramString(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first ? first : undefined;
}

/** Only in-app paths are accepted as a return destination; anything else goes home. */
export function safeReturnTo(value: string | string[] | undefined): string {
  const path = paramString(value);
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/';
}
