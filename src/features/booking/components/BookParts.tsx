import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { formatMinutes, formatMoney } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Button, Icon, IconTile, Text, categoryIcon } from '@/shared/ui';

/** A numbered step of "Reservar"; the number turns into a check once it is chosen. */
export function Step({
  number,
  title,
  done,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <View
          style={[
            styles.stepNumber,
            {
              backgroundColor: done ? theme.colors.primary : 'transparent',
              borderColor: done ? theme.colors.primary : theme.colors.border,
            },
          ]}
        >
          {done ? (
            <Icon name="checkmark" size={sizes.icon - spacing.xs} color={theme.colors.onPrimary} />
          ) : (
            <Text variant="label" color="textSecondary">
              {String(number)}
            </Text>
          )}
        </View>
        <Text variant="subtitle" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** A service to choose: name and duration on the left, price on the right. */
export function ServiceOption({
  service,
  selected,
  onPress,
}: {
  service: {
    name: string;
    durationMinutes: number;
    price: Parameters<typeof formatMoney>[0];
    category: { key: string };
  };
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${service.name}, ${formatMoney(service.price)}, ${formatMinutes(service.durationMinutes)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          borderRadius: theme.radius.lg,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: selected ? 2 : sizes.borderWidth,
          backgroundColor: selected || pressed ? theme.colors.primarySoft : theme.colors.surface,
        },
      ]}
    >
      <IconTile icon={categoryIcon(service.category.key)} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {service.name}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatMinutes(service.durationMinutes)}
        </Text>
      </View>
      <Text variant="bodyStrong" color="primary">
        {formatMoney(service.price)}
      </Text>
    </Pressable>
  );
}

/** Times in a grid of equal buttons: every free time visible at once, no hidden scrolling. */
export function SlotGrid({ children }: { children: ReactNode }) {
  return <View style={styles.slotGrid}>{children}</View>;
}

export function SlotButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.slot,
        {
          borderRadius: theme.radius.md,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected
            ? theme.colors.primary
            : pressed
              ? theme.colors.primarySoft
              : theme.colors.surface,
        },
      ]}
    >
      <Text variant="bodyStrong" color={selected ? 'onPrimary' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Fixed at the bottom: what is chosen so far and "Continuar". */
export function BookBar({
  summary,
  canContinue,
  onContinue,
}: {
  summary: string | null;
  canContinue: boolean;
  onContinue: () => void;
}) {
  const { t } = useTranslation('booking');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          paddingBottom: spacing.md + insets.bottom,
        },
      ]}
    >
      {summary ? (
        <Text variant="caption" color="textSecondary" numberOfLines={1} align="center">
          {summary}
        </Text>
      ) : null}
      <Button label={t('book.continue')} onPress={onContinue} disabled={!canContinue} fullWidth />
    </View>
  );
}

/** Room at the end of the scroll so the fixed bar never covers the last times. */
export const BOOK_BAR_SPACE = touchTarget * 2.5;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  step: { gap: spacing.md },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepNumber: {
    width: touchTarget * 0.6,
    height: touchTarget * 0.6,
    borderRadius: touchTarget * 0.3,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    flexBasis: '22%',
    flexGrow: 1,
    maxWidth: '32%',
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.borderWidth,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.xs,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
