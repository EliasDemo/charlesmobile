import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { usePopWhen } from './motion';

const STARS = [1, 2, 3, 4, 5] as const;

/** Read-only stars ("★★★★☆"), announced as "4 de 5 estrellas". */
export function Stars({ rating, size = sizes.icon }: { rating: number; size?: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.row} accessible accessibilityLabel={t('stars.label', { count: rating })}>
      {STARS.map((n) => (
        <Icon key={n} name={n <= rating ? 'star' : 'star-outline'} size={size} color={theme.colors.warning} />
      ))}
    </View>
  );
}

/** Choose 1 to 5 stars. Each star is a 44 pt button; the chosen one pops. */
export function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('stars.choose')}>
      {STARS.map((n) => (
        <PickerStar key={n} n={n} filled={n <= value} chosen={n === value} onPress={() => onChange(n)} />
      ))}
    </View>
  );
}

function PickerStar({
  n,
  filled,
  chosen,
  onPress,
}: {
  n: number;
  filled: boolean;
  chosen: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const pop = usePopWhen(chosen);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={t('stars.label', { count: n })}
      onPress={onPress}
      style={styles.button}
    >
      <Animated.View style={pop}>
        <Icon
          name={filled ? 'star' : 'star-outline'}
          size={sizes.iconLarge * STAR_RATIO}
          color={filled ? theme.colors.warning : theme.colors.textMuted}
        />
      </Animated.View>
    </Pressable>
  );
}

const STAR_RATIO = 0.8;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  button: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
