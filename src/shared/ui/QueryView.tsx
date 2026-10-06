import type { ReactNode } from 'react';
import { isNetworkError, translateError } from '@/shared/api';
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
}

/**
 * Renders the four states of a screen with data: loading, error, empty and data.
 * Cached data stays visible when a later refetch fails (e.g. offline).
 */
export function QueryView<T>({ query, isEmpty, empty, children }: QueryViewProps<T>) {
  if (query.data !== undefined) {
    if (isEmpty?.(query.data)) return <EmptyState title={empty?.title} message={empty?.message} />;
    return <>{children(query.data)}</>;
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
