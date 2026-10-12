import type { ReactNode } from 'react';
import { isApiError, isNetworkError, translateError, useIsOnline } from '@/shared/api';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatTime } from '@/shared/lib';
import { DevConnectionHint, showDevConnectionHint } from './DevConnectionHint';
import type { IconName } from './Icon';
import { SkeletonList } from './Skeleton';
import { EmptyState, ErrorState } from './StateViews';
import { Text } from './Text';

export interface QueryLike<T> {
  data: T | undefined;
  error: unknown;
  isRefetching?: boolean;
  /** When the data was read (TanStack Query), to say how old it is while offline. */
  dataUpdatedAt?: number;
  refetch: () => unknown;
}

export interface QueryViewProps<T> {
  query: QueryLike<T>;
  isEmpty?: (data: T) => boolean;
  empty?: {
    title?: string;
    message?: string;
    icon?: IconName;
    /** A useful next step ("Ver el día siguiente"). */
    action?: { label: string; onPress: () => void };
  };
  /** Skeleton cards shown while loading (1 by default: a section or a detail). */
  skeletonCount?: number;
  /** A skeleton with the shape of the screen (instead of generic cards). */
  skeleton?: ReactNode;
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
export function QueryView<T>({
  query,
  isEmpty,
  empty,
  children,
  notFound,
  skeletonCount = 1,
  skeleton,
}: QueryViewProps<T>) {
  const online = useIsOnline();
  const { t } = useTranslation();
  if (query.data !== undefined) {
    if (isEmpty?.(query.data)) {
      return (
        <EmptyState title={empty?.title} message={empty?.message} icon={empty?.icon} action={empty?.action} />
      );
    }
    // Offline with saved data: show it, and say from when (the banner explains the rest).
    const savedAt =
      !online && query.dataUpdatedAt
        ? formatTime(new Date(query.dataUpdatedAt).toISOString(), env.defaultTimeZone)
        : null;
    return (
      <>
        {savedAt ? (
          <Text variant="caption" color="textMuted" testID="saved-at">
            {t('offline.savedAt', { time: savedAt })}
          </Text>
        ) : null}
        {children(query.data)}
      </>
    );
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
  return skeleton ? <>{skeleton}</> : <SkeletonList count={skeletonCount} />;
}
