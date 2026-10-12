import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { translateError } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { FadeIn } from './motion';
import { useTabBarSpace } from './tabBarSpace';
import type { IconName } from './Icon';
import { SkeletonList } from './Skeleton';
import { EmptyState, ErrorState } from './StateViews';
import { Text } from './Text';

export interface InfiniteListQuery<T> {
  items: T[] | undefined;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

export interface InfiniteListProps<T> {
  query: InfiniteListQuery<T>;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  empty: {
    title?: string;
    message?: string;
    icon?: IconName;
    action?: { label: string; onPress: () => void };
  };
  /** Shown above the items (search bar, filters…). Stays visible in every state. */
  header?: ReactElement;
  /**
   * When the first pages come back empty but the server says there may be more (search with
   * availability filters), offer to keep looking instead of saying "no results".
   */
  canSearchMoreWhenEmpty?: boolean;
}

/**
 * Cursor-paginated list with the four states: loading, empty, error and data. Loads more at the
 * end, refreshes on pull, and shows an error with retry at the bottom if a later page fails
 * (the items already loaded stay visible).
 */
export function InfiniteList<T>({
  query,
  renderItem,
  keyExtractor,
  empty,
  header,
  canSearchMoreWhenEmpty = false,
}: InfiniteListProps<T>) {
  const tabBar = useTabBarSpace();
  const theme = useTheme();
  const { t } = useTranslation();
  const items = query.items ?? [];
  const firstLoad = query.items === undefined;

  const listEmpty = firstLoad ? (
    query.error ? (
      <ErrorState
        message={translateError(query.error).message}
        onRetry={() => void query.refetch()}
        retrying={query.isRefetching}
      />
    ) : (
      <SkeletonList />
    )
  ) : canSearchMoreWhenEmpty && query.hasNextPage ? (
    <EmptyState
      title={empty.title}
      message={t('list.searchMoreHint')}
      action={{ label: t('list.searchMore'), onPress: () => void query.fetchNextPage() }}
    />
  ) : (
    <EmptyState title={empty.title} message={empty.message} icon={empty.icon} action={empty.action} />
  );

  const footer =
    items.length === 0 ? null : query.isFetchingNextPage ? (
      <ActivityIndicator
        style={styles.footer}
        color={theme.colors.primary}
        accessibilityLabel={t('states.loading')}
      />
    ) : query.error ? (
      <View style={styles.footer}>
        <Text color="textSecondary" align="center">
          {translateError(query.error).message}
        </Text>
        <Button label={t('actions.retry')} variant="secondary" onPress={() => void query.fetchNextPage()} />
      </View>
    ) : null;

  return (
    <FlatList
      data={items}
      renderItem={(info) => <FadeIn index={info.index}>{renderItem(info)}</FadeIn>}
      keyExtractor={keyExtractor}
      testID="infinite-list"
      ListHeaderComponent={header}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={footer}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage && !query.error) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      contentContainerStyle={[styles.content, tabBar ? { paddingBottom: spacing.lg + tabBar } : null]}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.colors.background }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  footer: { padding: spacing.lg, gap: spacing.sm },
});
