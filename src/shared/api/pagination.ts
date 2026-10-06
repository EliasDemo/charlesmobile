/** A cursor page as every list endpoint returns it. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Loads every page of a short list (services, barbers, favorite ids). Stops at `maxPages` so a
 * misbehaving server cannot loop forever. Long lists use infinite queries instead.
 */
export async function fetchAllPages<T>(
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
  maxPages = 10,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(cursor);
    items.push(...result.items);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return items;
}

/** For useInfiniteQuery: the next cursor, or undefined when there are no more pages. */
export const nextPageParam = <T>(lastPage: Page<T>): string | undefined => lastPage.nextCursor ?? undefined;
