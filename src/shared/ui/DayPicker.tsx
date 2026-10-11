import { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { usePressScale } from './motion';
import { Text } from './Text';

export interface DayOption {
  /** Calendar day as the API expects it (YYYY-MM-DD). */
  date: string;
  /** Day of week, 0 = Sunday (as the API's business hours). */
  dayOfWeek: number;
  dayOfMonth: number;
}

export interface DayPickerProps {
  days: readonly DayOption[];
  selected: string | null;
  onSelect: (date: string | null) => void;
  /** Accessible name of the group. */
  label: string;
  /** Today's date: days are named relative to it (Ayer, Hoy, Mañana). Default: the first day is today. */
  today?: string;
  /** Selecting again does not clear it. */
  required?: boolean;
}

/**
 * Horizontal list of days (no native date picker: it would need a new native module).
 * Each day is a tile: weekday (or Hoy/Mañana/Ayer) on top, the day number big. Tapping the
 * selected day clears it, unless `required`.
 */
export function DayPicker({ days, selected, onSelect, label, today, required = false }: DayPickerProps) {
  const { t } = useTranslation();
  const shortNames = t('daysShort', { returnObjects: true }) as readonly string[];
  // With past days first, open showing the selected day (once), not the start of the list.
  const scroll = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  const offset = today ? days.findIndex((d) => d.date === today) : 0;
  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={label}
    >
      {days.map((day, index) => {
        const relative = index - offset;
        const isSelected = selected === day.date;
        const relativeName =
          relative === 0
            ? t('date.today')
            : relative === 1
              ? t('date.tomorrow')
              : relative === -1 && today
                ? t('date.yesterday')
                : null;
        const weekday = shortNames[day.dayOfWeek] ?? '';
        const name = relativeName ?? `${weekday} ${day.dayOfMonth}`;
        return (
          <View
            key={day.date}
            onLayout={
              isSelected && offset > 0
                ? (e) => {
                    if (scrolled.current) return;
                    scrolled.current = true;
                    scroll.current?.scrollTo({
                      x: Math.max(0, e.nativeEvent.layout.x - spacing.xl),
                      animated: false,
                    });
                  }
                : undefined
            }
          >
            <DayTile
              name={name}
              top={relativeName ?? weekday}
              dayOfMonth={day.dayOfMonth}
              selected={isSelected}
              onPress={() => onSelect(isSelected && !required ? null : day.date)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

/** One day: weekday (or Hoy/Mañana/Ayer) on top, the number big; bounces while pressed. */
function DayTile({
  name,
  top,
  dayOfMonth,
  selected,
  onPress,
}: {
  name: string;
  top: string;
  dayOfMonth: number;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityState={{ selected }}
        onPress={onPress}
        {...press.handlers}
        style={({ pressed }) => [
          styles.day,
          {
            borderRadius: theme.radius.md,
            backgroundColor: selected
              ? theme.colors.primary
              : pressed
                ? theme.colors.primarySoft
                : theme.colors.surface,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        <Text
          variant="caption"
          style={{ color: selected ? theme.colors.onPrimary : theme.colors.textSecondary }}
          numberOfLines={1}
        >
          {top}
        </Text>
        <Text
          variant="subtitle"
          style={{ color: selected ? theme.colors.onPrimary : theme.colors.textPrimary }}
        >
          {String(dayOfMonth)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xxs },
  day: {
    minWidth: touchTarget + spacing.md,
    minHeight: touchTarget + spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.borderWidth,
  },
});
