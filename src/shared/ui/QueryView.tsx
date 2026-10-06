import type { ReactNode } from 'react';
import { isApiError, isNetworkError, translateError } from '@/shared/api';
import { DevConnectionHint, showDevConnectionHint } from './DevConnectionHint';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

export interface QueryLike<T> {
  data: T | undefined;
  error: unknown;
  isRefetching?: boolean;
  refetch: () => unknown;
}

export interface QueryViewProps<T> {
  query: QueryLike<T>;
  isEmpty?: (data: T) => boolean;
  empty?: { title?: string; message?: string };
  children: (data: T) => ReactNode;
  /**
   * 404 (missing or not visible: the backend answers the same for both) shown as an empty state
   * with a way out instead of "retry".
   */
  notFound?: { title: string; message?: string; action: { label: string; onPress: () => void } };
}

/**
 * Renders the four states of a screen with data: loading, error, empty and data.
 * Cached data stays visible when a later refetch fails (e.g. offline).
 */
export function QueryView<T>({ query, isEmpty, empty, children, notFound }: QueryViewProps<T>) {
  if (query.data !== undefined) {
    if (isEmpty?.(query.data)) return <EmptyState title={empty?.title} message={empty?.message} />;
    return <>{children(query.data)}</>;
  }
  if (notFound && isApiError(query.error) && query.error.status === 404) {
    return <EmptyState title={notFound.title} message={notFound.message} action={notFound.action} />;
  }
  if (query.error) {
    return (
      <ErrorState
        message={translateError(query.error).message}
        onRetry={() => void query.refetch()}
        retrying={query.isRefetching}
      >
        {showDevConnectionHint && isNetworkError(query.error) ? <DevConnectionHint /> : null}
      </ErrorState>
    );
  }
  return <LoadingState />;
}
