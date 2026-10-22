import { Pressable, StyleSheet, View } from 'react-native';
import type { Barber } from '@/features/barbershop';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Badge, Icon, Monogram, RatingLabel, Text } from '@/shared/ui';

/**
 * A barber to choose when booking: photo, stars and reviews (as the API gives them), a "Mejor
 * valorado" highlight, and "Ver perfil" to read their reviews before choosing.
 */
export function BarberChoice({
  barber,
  selected,
  topRated,
  onSelect,
  onOpenProfile,
}: {
  barber: Barber;
  selected: boolean;
  topRated: boolean;
  onSelect: () => void;
  onOpenProfile?: () => void;
}) {
  const { t } = useTranslation('booking');
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={barber.displayName}
        onPress={onSelect}
        style={styles.main}
        testID={`barber-choice-${barber.id}`}
      >
        <Monogram name={barber.displayName} size={sizes.avatar} imageUrl={barber.photoUrl} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{barber.displayName}</Text>
          <RatingLabel average={barber.rating.average} count={barber.rating.count} variant="caption" />
          {topRated ? <Badge tone="primary" label={t('book.topRated')} /> : null}
        </View>
        <Icon
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={sizes.icon}
          color={selected ? theme.colors.primary : theme.colors.textMuted}
        />
      </Pressable>
      {onOpenProfile ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('book.seeProfileOf', { name: barber.displayName })}
          onPress={onOpenProfile}
          style={styles.link}
          testID={`barber-choice-profile-${barber.id}`}
        >
          <Text variant="label" color="primary">
            {t('book.seeProfile')}
          </Text>
          <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: sizes.borderWidth, overflow: 'hidden' },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: touchTarget,
  },
  flex: { flex: 1, gap: spacing.xxs, alignItems: 'flex-start' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    minHeight: touchTarget,
  },
});
