import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Button } from './Button';
import { DayPicker, type DayPickerProps } from './DayPicker';
import { FadeIn } from './motion';
import { MonthCalendar } from './MonthCalendar';

export interface DateSelectorProps extends DayPickerProps {
  /** Days that cannot be chosen, as the API reported them (closed, no slots…). */
  disabledDates?: readonly string[];
  /** Days with something (bookings): a dot in the month view. */
  markedDates?: readonly string[];
}

/**
 * The day strip for nearby days, plus "Ver calendario" to pick any day of the allowed range in a
 * month view. Both choose from the same days the screen offers.
 */
export function DateSelector({ disabledDates, markedDates, ...strip }: DateSelectorProps) {
  const { t } = useTranslation();
  const [month, setMonth] = useState(false);
  const first = strip.days[0]?.date;
  const last = strip.days[strip.days.length - 1]?.date;
  return (
    <View style={styles.root}>
      {month ? (
        <FadeIn>
          <MonthCalendar
            selected={strip.selected}
            minDate={first}
            maxDate={last}
            disabledDates={disabledDates}
            markedDates={markedDates}
            onSelect={(date) => {
              strip.onSelect(date);
              setMonth(false);
            }}
          />
        </FadeIn>
      ) : (
        <DayPicker {...strip} />
      )}
      <Button
        label={month ? t('calendar.showDays') : t('calendar.showMonth')}
        variant="ghost"
        icon={month ? 'list' : 'calendar'}
        onPress={() => setMonth((m) => !m)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs, alignItems: 'stretch' },
});
