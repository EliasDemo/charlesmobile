import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import type { Location } from '@/shared/api';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  Badge,
  DistrictPicker,
  EmptyState,
  Icon,
  LoadingState,
  Monogram,
  Screen,
  Text,
  useSurfaceStyle,
} from '@/shared/ui';
import type { RankedBarber } from '../api/careerApi';
import { useRanking } from '../hooks/useCareer';

/** A big card: photo, position, stars, attended, specialties and where they work. */
function BarberCard({
  barber,
  place,
  onOpen,
  actions,
}: {
  barber: RankedBarber;
  place?: number;
  onOpen: () => void;
  actions?: ReactNode;
}) {
  const { t } = useTranslation('career');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  return (
    <View style={[styles.card, surface]} testID={`talent-${barber.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={barber.displayName}
        onPress={onOpen}
        style={styles.top}
      >
        <View>
          <Monogram name={barber.displayName} size={sizes.avatarLarge} imageUrl={barber.photoUrl} />
          {place !== undefined ? (
            <View
              style={[
                styles.medal,
                {
                  backgroundColor:
                    [theme.colors.medalGold, theme.colors.medalSilver, theme.colors.medalBronze][place] ??
                    theme.colors.primary,
                },
              ]}
            >
              <Text variant="caption" color="onPrimary">
                {place + 1}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.flex}>
          <Text variant="subtitle">{barber.displayName}</Text>
          {barber.headline ? <Text color="textSecondary">{barber.headline}</Text> : null}
          <Text variant="caption" color={barber.rank ? 'primary' : 'textMuted'}>
            {barber.rank ? t('rank', { rank: barber.rank }) : t('newTalent')}
          </Text>
        </View>
        <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.textMuted} />
      </Pressable>
      <View style={styles.facts}>
        {barber.ratingAverage !== null ? (
          <Badge label={`★ ${barber.ratingAverage.toFixed(1)} (${barber.ratingCount})`} tone="warning" />
        ) : null}
        <Badge label={t('attended', { count: barber.attendedCount })} />
        {barber.district ? <Badge label={barber.district} /> : null}
        {barber.availableForWork ? <Badge label={t('availableForWork')} tone="success" /> : null}
      </View>
      {barber.specialties.length > 0 ? (
        <Text variant="caption" color="textSecondary">
          {barber.specialties.map((s) => s.name).join(' · ')}
        </Text>
      ) : null}
      {barber.currentBarbershops.length > 0 ? (
        <Text variant="caption" color="textMuted">
          {t('talent.worksAt', { shops: barber.currentBarbershops.join(', ') })}
        </Text>
      ) : null}
      {actions}
    </View>
  );
}

/**
 * "Barberos disponibles" for a barbershop: first those of the chosen district (with a podium),
 * then the rest of its province, then all of Peru. Each one with "Ver perfil", "Escribir" and
 * "Invitar" (given by the route).
 */
export function TalentScreen({
  onOpen,
  renderActions,
}: {
  onOpen: (profileId: string) => void;
  renderActions: (barber: RankedBarber) => ReactNode;
}) {
  const { t } = useTranslation('career');
  const [place, setPlace] = useState<Location | null>(null);
  const district = place?.district ?? '';
  const province = place?.province ?? '';
  // Without a district the whole country is "local" (the podium is the national top).
  const local = useRanking({ district: district || undefined, availableForWork: true });
  // The province and the country are filtered by the backend (its list of provinces).
  const inProvince = useRanking({ province: province || undefined, availableForWork: true });
  const national = useRanking({ availableForWork: true });
  const localItems = local.items ?? [];
  const sameProvince = !place
    ? []
    : (inProvince.items ?? []).filter((b) => !localItems.some((l) => l.id === b.id));
  const rest = !place
    ? []
    : (national.items ?? []).filter(
        (b) => !localItems.some((l) => l.id === b.id) && !sameProvince.some((p) => p.id === b.id),
      );
  const podium = localItems.filter((b) => b.rank !== null).slice(0, 3);
  const card = (b: RankedBarber, place?: number) => (
    <BarberCard key={b.id} barber={b} place={place} onOpen={() => onOpen(b.id)} actions={renderActions(b)} />
  );
  return (
    <Screen>
      <Text color="textSecondary">{t('talent.intro')}</Text>
      <DistrictPicker label={t('talent.district')} value={place} onChange={setPlace} allowAll />
      {local.items === undefined ? <LoadingState /> : null}
      {podium.length > 0 ? (
        <View style={styles.section}>
          <Text variant="subtitle">{district ? t('talent.top', { district }) : t('talent.topNational')}</Text>
          {podium.map((b, i) => card(b, i))}
        </View>
      ) : null}
      <View style={styles.section}>
        <Text variant="subtitle">
          {district ? t('talent.inDistrict', { district }) : t('talent.national')}
        </Text>
        {local.items && localItems.length === 0 ? (
          <EmptyState title={t('talent.noneHere', { district })} icon="people-outline" />
        ) : null}
        {localItems.filter((b) => !podium.includes(b)).map((b) => card(b))}
      </View>
      {sameProvince.length > 0 ? (
        <View style={styles.section}>
          <Text variant="subtitle">{t('talent.inProvince', { province })}</Text>
          {sameProvince.map((b) => card(b))}
        </View>
      ) : null}
      {rest.length > 0 ? (
        <View style={styles.section}>
          <Text variant="subtitle">{t('talent.national')}</Text>
          {rest.map((b) => card(b))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { padding: spacing.md, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  medal: {
    position: 'absolute',
    right: -spacing.xxs,
    bottom: -spacing.xxs,
    width: sizes.icon + spacing.xs,
    height: sizes.icon + spacing.xs,
    borderRadius: (sizes.icon + spacing.xs) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
