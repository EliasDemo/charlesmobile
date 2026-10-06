import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon, InfiniteList, Monogram, Notice, RatingLabel, Text } from '@/shared/ui';
import type { Favorite } from '../api/favoritesApi';
import { useFavoritesList } from '../hooks/useFavorites';

export function FavoritesScreen({ onOpenBarbershop }: { onOpenBarbershop: (id: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation('favorites');
  const { query, remove, removingId, removeError } = useFavoritesList();

  const renderItem = ({ item }: { item: Favorite }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => onOpenBarbershop(item.barbershopId)}
        style={styles.main}
      >
        <Monogram name={item.name} size={sizes.avatarSmall} />
        <View style={styles.texts}>
          <Text variant="bodyStrong">{item.name}</Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {item.address}
          </Text>
          <RatingLabel average={item.rating.average} count={item.rating.count} variant="caption" />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('remove', { name: item.name })}
        accessibilityState={{ busy: removingId === item.barbershopId }}
        disabled={removingId === item.barbershopId}
        onPress={() => remove(item.barbershopId)}
        style={styles.remove}
      >
        <Icon name="heart" color={theme.colors.danger} />
      </Pressable>
    </View>
  );

  return (
    <InfiniteList
      query={query}
      header={removeError ? <Notice tone="danger" message={removeError} /> : undefined}
      renderItem={renderItem}
      keyExtractor={(item) => item.barbershopId}
      empty={{ title: t('empty.title'), message: t('empty.message') }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: sizes.borderWidth,
    paddingRight: spacing.xs,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  texts: { flex: 1, gap: spacing.xxs },
  remove: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
