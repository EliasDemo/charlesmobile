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
}

/**
 * Horizontal list of days (no native date picker: it would need a new native module).
 * Tapping the selected day clears it.
 */
export function DayPicker({ days, selected, onSelect, label }: DayPickerProps) {
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
        const name =
          index === 0
            ? t('date.today')
            : index === 1
              ? t('date.tomorrow')
              : `${shortNames[day.dayOfWeek] ?? ''} ${day.dayOfMonth}`;
        return (
          <Chip
            key={day.date}
            label={name}
            selected={selected === day.date}
            onPress={() => onSelect(selected === day.date ? null : day.date)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xxs },
});
