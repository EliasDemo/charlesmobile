import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, touchTarget, useTheme } from '@/shared/theme';
import { Icon, Text } from '@/shared/ui';
import { useFavoriteToggle } from '../hooks/useFavorites';

export interface FavoriteButtonProps {
  barbershopId: string;
  /** Without a session: the route sends the user to login and back. */
  onRequireLogin: () => void;
}

export function FavoriteButton({ barbershopId, onRequireLogin }: FavoriteButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation('barbershop');
  const favorite = useFavoriteToggle(barbershopId);
  const label = favorite.isFavorite ? t('favorite.remove') : t('favorite.add');
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{
          selected: favorite.isFavorite,
          disabled: !favorite.ready,
          busy: favorite.isSaving,
        }}
        disabled={!favorite.ready}
        onPress={favorite.authenticated ? favorite.toggle : onRequireLogin}
        style={[styles.button, { borderColor: theme.colors.border, borderRadius: touchTarget / 2 }]}
        testID="favorite-button"
      >
        <Icon
          name={favorite.isFavorite ? 'heart' : 'heart-outline'}
          color={favorite.isFavorite ? theme.colors.danger : theme.colors.textPrimary}
          size={sizes.icon}
        />
      </Pressable>
      {favorite.error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {t('favorite.error')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end' },
  button: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.borderWidth,
  },
});
