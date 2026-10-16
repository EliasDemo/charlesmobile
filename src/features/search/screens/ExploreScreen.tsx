import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  Button,
  Chip,
  ConfirmDialog,
  InfiniteList,
  Notice,
  SearchField,
  Text,
  ScreenTitle,
} from '@/shared/ui';
import { ResultCard } from '../components/ResultCard';
import { SearchMap } from '../components/SearchMap';
import { useSearchStore } from '../hooks/searchStore';
import { useNearMe } from '../hooks/useNearMe';
import { useCategories, useSearchResults } from '../hooks/useSearchResults';

export interface ExploreScreenProps {
  onOpenBarbershop: (id: string) => void;
  onOpenFilters: () => void;
  /** Action on the right of the title (the notifications bell, given by the route). */
  headerRight?: ReactNode;
  /** "Barberos" (ranking) and "Empleos". */
  onOpenBarbers?: () => void;
  onOpenJobs?: () => void;
  /** Sponsor spaces: on the start page, and above the results of a search. */
  homeBanner?: ReactNode;
  resultsTop?: ReactNode;
}

export function ExploreScreen({
  onOpenBarbershop,
  onOpenFilters,
  headerRight,
  onOpenBarbers,
  onOpenJobs,
  homeBanner,
  resultsTop,
}: ExploreScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation('search');
  const store = useSearchStore();
  const results = useSearchResults();
  const nearMe = useNearMe();
  const categories = useCategories();

  const header = (
    <View style={styles.header}>
      <ScreenTitle title={t('title')} right={headerRight} />
      <SearchField
        value={store.text}
        onChangeText={store.setText}
        placeholder={t('placeholder')}
        label={t('fieldLabel')}
      />
      {results.textTooShort ? (
        <Text variant="caption" color="textSecondary">
          {t('minChars')}
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label={nearMe.active ? t('nearMeActive') : t('nearMe')}
          selected={nearMe.active}
          onPress={nearMe.active ? nearMe.stop : nearMe.start}
          accessibilityHint={nearMe.active ? t('nearMeOff') : undefined}
        />
        <Chip
          label={
            results.activeFilters > 0 ? t('filtersActive', { count: results.activeFilters }) : t('filters')
          }
          selected={results.activeFilters > 0}
          onPress={onOpenFilters}
          accessibilityHint={
            results.activeFilters > 0 ? t('filtersHint', { count: results.activeFilters }) : undefined
          }
        />
        <Chip
          label={store.view === 'list' ? t('viewMap') : t('viewList')}
          onPress={() => store.setView(store.view === 'list' ? 'map' : 'list')}
        />
        {onOpenBarbers ? <Chip label={t('barbers')} onPress={onOpenBarbers} /> : null}
        {onOpenJobs ? <Chip label={t('jobs')} onPress={onOpenJobs} /> : null}
      </ScrollView>
      {categories.data && categories.data.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip
            label={t('allCategories')}
            selected={store.filters.category === null}
            onPress={() => store.setCategory(null)}
          />
          {categories.data.map((category) => (
            <Chip
              key={category.key}
              label={category.name}
              selected={store.filters.category === category.key}
              onPress={() => store.setCategory(store.filters.category === category.key ? null : category.key)}
            />
          ))}
        </ScrollView>
      ) : null}
      {nearMe.status === 'denied' ? <Notice tone="warning" message={t('location.denied')} /> : null}
      {nearMe.status === 'blocked' ? (
        <Notice tone="warning" message={t('location.blocked')}>
          <Button label={t('location.openSettings')} variant="secondary" onPress={nearMe.openSettings} />
        </Notice>
      ) : null}
      {nearMe.status === 'unavailable' ? <Notice tone="warning" message={t('location.unavailable')} /> : null}
      {results.outsidePeru ? <Notice tone="info" message={t('location.outsidePeru')} /> : null}
      {nearMe.status === 'locating' ? (
        <Text variant="caption" color="textSecondary">
          {t('states.loading', { ns: 'common' })}
        </Text>
      ) : null}
      {store.view === 'list' ? (results.usingDefaultOrder ? homeBanner : resultsTop) : null}
      {store.view === 'list' && results.usingDefaultOrder && results.query.items?.length ? (
        // "Mejor valoradas" only when some result actually has reviews.
        <Text variant="subtitle">
          {results.query.items.some((item) => item.rating.count > 0) ? t('topRated') : t('allBarbershops')}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      {store.view === 'list' ? (
        <InfiniteList
          query={results.query}
          header={header}
          renderItem={({ item }) => <ResultCard item={item} onPress={onOpenBarbershop} />}
          keyExtractor={(item) => item.id}
          empty={{ title: t('empty.title'), message: t('empty.message'), icon: 'search' }}
          canSearchMoreWhenEmpty={results.evaluationLimitReached}
        />
      ) : (
        <View style={styles.root}>
          <View style={styles.mapHeader}>{header}</View>
          <SearchMap
            items={results.query.items ?? []}
            center={store.center}
            onSearchHere={store.setCenter}
            onOpenBarbershop={onOpenBarbershop}
            onShowList={() => store.setView('list')}
          />
        </View>
      )}
      <ConfirmDialog
        visible={nearMe.status === 'explaining'}
        title={t('location.explainTitle')}
        message={t('location.explainMessage')}
        confirmLabel={t('location.explainContinue')}
        onConfirm={nearMe.acceptExplanation}
        onCancel={nearMe.dismiss}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: spacing.md, paddingBottom: spacing.xs },
  mapHeader: {
    padding: spacing.lg,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  chips: { gap: spacing.sm },
});
