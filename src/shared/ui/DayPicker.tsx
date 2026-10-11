import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Chip } from './Chip';

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
 * Tapping the selected day clears it.
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
        const name =
          relative === 0
            ? t('date.today')
            : relative === 1
              ? t('date.tomorrow')
              : relative === -1 && today
                ? t('date.yesterday')
                : `${shortNames[day.dayOfWeek] ?? ''} ${day.dayOfMonth}`;
        return (
          <View
            key={day.date}
            onLayout={
              selected === day.date && offset > 0
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
            <Chip
              label={name}
              selected={selected === day.date}
              onPress={() => onSelect(selected === day.date && !required ? null : day.date)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xxs },
});
