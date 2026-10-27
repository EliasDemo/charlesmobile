import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  BrandHero,
  Button,
  Chip,
  ConfirmDialog,
  Icon,
  InfiniteList,
  Notice,
  SearchField,
  Text,
  ScreenTitle,
  SectionHeading,
  TourTarget,
  useFirstTimeTour,
  type IconName,
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
  /** "Cortes para tu cara". */
  onOpenFace?: () => void;
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
  onOpenFace,
  homeBanner,
  resultsTop,
}: ExploreScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation('search');
  const store = useSearchStore();
  const results = useSearchResults();
  const nearMe = useNearMe();
  const categories = useCategories();
  useFirstTimeTour(
    'explore',
    [
      { target: 'explore.search', key: 'search' },
      { target: 'explore.nearMe', key: 'nearMe' },
      { target: 'explore.face', key: 'face' },
    ],
    'tour',
  );

  const header = (
    <View style={styles.header}>
      <ScreenTitle title={t('title')} right={headerRight} />
      <BrandHero compact eyebrow={t('hero.eyebrow')} title={t('hero.title')}>
        <TourTarget id="explore.search">
          <SearchField
            value={store.text}
            onChangeText={store.setText}
            placeholder={t('placeholder')}
            label={t('fieldLabel')}
          />
        </TourTarget>
      </BrandHero>
      {results.textTooShort ? (
        <Text variant="caption" color="textSecondary">
          {t('minChars')}
        </Text>
      ) : null}
      <View style={styles.quick}>
        <TourTarget id="explore.nearMe">
          <QuickAction
            icon="navigate"
            label={nearMe.active ? t('nearMeActive') : t('nearMe')}
            selected={nearMe.active}
            onPress={nearMe.active ? nearMe.stop : nearMe.start}
            hint={nearMe.active ? t('nearMeOff') : undefined}
          />
        </TourTarget>
        {onOpenFace ? (
          <TourTarget id="explore.face">
            <QuickAction icon="happy" label={t('face')} onPress={onOpenFace} highlight />
          </TourTarget>
        ) : null}
        {onOpenBarbers ? <QuickAction icon="trophy" label={t('barbers')} onPress={onOpenBarbers} /> : null}
        {onOpenJobs ? <QuickAction icon="briefcase" label={t('jobs')} onPress={onOpenJobs} /> : null}
      </View>
      <View style={styles.toolbar}>
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
      </View>
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
        <SectionHeading
          icon={results.query.items.some((item) => item.rating.count > 0) ? 'star' : 'storefront'}
          title={
            results.query.items.some((item) => item.rating.count > 0) ? t('topRated') : t('allBarbershops')
          }
        />
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
            onLocate={nearMe.start}
            onLocateSilently={nearMe.locateIfAllowed}
            locating={nearMe.status === 'locating'}
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

/** A round shortcut with its label; "Cortes para tu cara" is highlighted in copper. */
function QuickAction({
  icon,
  label,
  onPress,
  selected = false,
  highlight = false,
  hint,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  selected?: boolean;
  highlight?: boolean;
  hint?: string;
}) {
  const theme = useTheme();
  const filled = selected || highlight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.action}
    >
      <View
        style={[
          styles.actionIcon,
          {
            borderRadius: theme.radius.lg,
            backgroundColor: filled ? theme.colors.primary : theme.colors.primarySoft,
          },
        ]}
      >
        <Icon name={icon} size={sizes.icon} color={filled ? theme.colors.onPrimary : theme.colors.primary} />
      </View>
      <Text variant="caption" align="center" numberOfLines={2} color={selected ? 'primary' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  action: { flex: 1, alignItems: 'center', gap: spacing.xs, minHeight: touchTarget },
  actionIcon: {
    width: touchTarget + spacing.sm,
    height: touchTarget + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: { flexDirection: 'row', gap: spacing.sm },
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
