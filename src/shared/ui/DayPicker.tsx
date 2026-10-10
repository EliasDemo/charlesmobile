import { ScrollView, StyleSheet } from 'react-native';
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={label}
    >
      {days.map((day, index) => {
        const offset = today ? days.findIndex((d) => d.date === today) : 0;
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
          <Chip
            key={day.date}
            label={name}
            selected={selected === day.date}
            onPress={() => onSelect(selected === day.date && !required ? null : day.date)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xxs },
});
