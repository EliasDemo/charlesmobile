import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatRating } from '@/shared/lib';
import { spacing, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text, type TextProps } from './Text';

export interface RatingLabelProps {
  /** As the API sends it: null (search) or a count of 0 means "no reviews yet". */
  average: number | null;
  count: number;
  variant?: TextProps['variant'];
}

/** "★ 4,5 (12)" or "Sin valoraciones". Only shows what the API returns. */
export function RatingLabel({ average, count, variant = 'label' }: RatingLabelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (average === null || count === 0) {
    return (
      <Text variant={variant} color="textSecondary">
        {t('rating.none')}
      </Text>
    );
  }
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t('rating.a11y', { average: formatRating(average), count })}
    >
      <Icon name="star" color={theme.colors.warning} size={theme.typography.label.fontSize} />
      <Text variant={variant}>{formatRating(average)}</Text>
      <Text variant={variant} color="textSecondary">
        ({count})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
