import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatRating } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Chip, DayPicker, Screen, SwitchRow, Text } from '@/shared/ui';
import { PRICE_PRESETS, money } from '../config/pricePresets';
import { RADIUS_OPTIONS_KM, RATING_OPTIONS, type SortOption } from '../hooks/searchStore';
import { useFiltersDraft } from '../hooks/useFiltersDraft';

export function FiltersScreen({ onApplied }: { onApplied: () => void }) {
  const { t } = useTranslation('search');
  const { draft, update, toggle, categories, days, hasCenter, clear, apply } = useFiltersDraft({ onApplied });

  const priceLabel = (preset: (typeof PRICE_PRESETS)[number]) => {
    const min = 'minPrice' in preset ? formatMoney(money(preset.minPrice), { compact: true }) : null;
    const max = 'maxPrice' in preset ? formatMoney(money(preset.maxPrice), { compact: true }) : null;
    if (min && 'maxPrice' in preset) {
      return t('pricePresets.between', {
        min,
        max: formatMoney(money(preset.maxPrice), { compact: true, symbol: false }),
      });
    }
    if (max) return t('pricePresets.upTo', { max });
    // "Más de S/ 40": the label uses the previous range's limit.
    const previous = PRICE_PRESETS[PRICE_PRESETS.indexOf(preset) - 1];
    const limit =
      previous && 'maxPrice' in previous ? formatMoney(money(previous.maxPrice), { compact: true }) : min;
    return t('pricePresets.over', { min: limit });
  };

  const sortOptions: SortOption[] = hasCenter ? ['distance', 'rating', 'price'] : ['rating', 'price'];

  return (
    <Screen>
      {categories.data && categories.data.length > 0 ? (
        <Section title={t('filtersScreen.category')}>
          {categories.data.map((category) => (
            <Chip
              key={category.key}
              label={category.name}
              selected={draft.category === category.key}
              onPress={() => toggle('category', category.key)}
            />
          ))}
        </Section>
      ) : null}
      <Section title={t('filtersScreen.price')}>
        {PRICE_PRESETS.map((preset) => (
          <Chip
            key={preset.id}
            label={priceLabel(preset)}
            selected={draft.pricePreset === preset.id}
            onPress={() => toggle('pricePreset', preset.id)}
          />
        ))}
      </Section>
      <Section title={t('filtersScreen.rating')}>
        {RATING_OPTIONS.map((rating) => (
          <Chip
            key={rating}
            label={t('filtersScreen.ratingAtLeast', { rating: formatRating(rating) })}
            selected={draft.minRating === rating}
            onPress={() => toggle('minRating', rating)}
          />
        ))}
      </Section>
      <Section title={t('filtersScreen.type')}>
        <Chip
          label={t('filtersScreen.typeAll')}
          selected={draft.type === null}
          onPress={() => update('type', null)}
        />
        <Chip
          label={t('filtersScreen.typeBarbershop')}
          selected={draft.type === 'BARBERSHOP'}
          onPress={() => toggle('type', 'BARBERSHOP')}
        />
        <Chip
          label={t('filtersScreen.typeIndependent')}
          selected={draft.type === 'INDEPENDENT'}
          onPress={() => toggle('type', 'INDEPENDENT')}
        />
      </Section>
      <View>
        <Text variant="subtitle">{t('filtersScreen.availability')}</Text>
        <SwitchRow
          title={t('filtersScreen.openNow')}
          value={draft.openNow}
          onValueChange={(v) => update('openNow', v)}
        />
        <SwitchRow
          title={t('filtersScreen.availableNow')}
          value={draft.availableNow}
          onValueChange={(v) => update('availableNow', v)}
        />
      </View>
      <View style={styles.section}>
        <Text variant="subtitle">{t('filtersScreen.date')}</Text>
        <DayPicker
          days={days}
          selected={draft.date}
          onSelect={(date) => update('date', date)}
          label={t('filtersScreen.date')}
        />
      </View>
      <Section title={t('sort.label')}>
        {sortOptions.map((sort) => (
          <Chip
            key={sort}
            label={t(`sort.${sort}`)}
            selected={draft.sort === sort}
            onPress={() => toggle('sort', sort)}
          />
        ))}
      </Section>
      {hasCenter ? (
        <Section title={t('filtersScreen.radius')}>
          {RADIUS_OPTIONS_KM.map((km) => (
            <Chip
              key={km}
              label={t('filtersScreen.radiusKm', { km })}
              selected={draft.radiusKm === km}
              onPress={() => toggle('radiusKm', km)}
            />
          ))}
        </Section>
      ) : (
        <Text variant="caption" color="textSecondary">
          {t('filtersScreen.radiusNeedsLocation')}
        </Text>
      )}
      <Button label={t('filtersScreen.apply')} onPress={apply} fullWidth />
      <Button label={t('filtersScreen.clear')} variant="ghost" onPress={clear} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="subtitle">{title}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
