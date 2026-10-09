import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatRating } from '@/shared/lib';
import { sizes, touchTarget, useTheme } from '@/shared/theme';
import { Icon, InfiniteList, InfoCard, Monogram, Notice, type InfoItem } from '@/shared/ui';
import type { Favorite } from '../api/favoritesApi';
import { useFavoritesList } from '../hooks/useFavorites';

export function FavoritesScreen({ onOpenBarbershop }: { onOpenBarbershop: (id: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation('favorites');
  const { query, remove, removingId, removeError } = useFavoritesList();

  const renderItem = ({ item }: { item: Favorite }) => {
    const details: InfoItem[] = [
      item.rating.count > 0
        ? { icon: 'star', text: `${formatRating(item.rating.average)} (${item.rating.count})` }
        : { icon: 'star-outline', text: t('rating.none', { ns: 'common' }) },
    ];
    return (
      <InfoCard
        onPress={() => onOpenBarbershop(item.barbershopId)}
        leading={<Monogram name={item.name} size={sizes.avatarSmall} />}
        title={item.name}
        subtitle={item.address}
        details={details}
        trailing={
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
        }
      />
    );
  };

  return (
    <InfiniteList
      query={query}
      header={removeError ? <Notice tone="danger" message={removeError} /> : undefined}
      renderItem={renderItem}
      keyExtractor={(item) => item.barbershopId}
      empty={{ title: t('empty.title'), message: t('empty.message'), icon: 'heart-outline' }}
    />
  );
}

const styles = StyleSheet.create({
  remove: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
