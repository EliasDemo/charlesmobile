import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { useTranslation } from '@/shared/i18n';
import type { TFunction } from 'i18next';
import { fontFamily, typography, useTheme } from '@/shared/theme';
import { useSurfaceStyle } from './surface';

/** Registers the month and day names of a language (es / en) once, from the translation files. */
function applyCalendarLocale(language: string, t: TFunction) {
  if (!LocaleConfig.locales[language]) {
    LocaleConfig.locales[language] = {
      monthNames: t('calendar.months', { returnObjects: true }) as string[],
      monthNamesShort: t('calendar.monthsShort', { returnObjects: true }) as string[],
      dayNames: t('days', { returnObjects: true }) as string[],
      dayNamesShort: t('daysShort', { returnObjects: true }) as string[],
      today: t('date.today'),
    };
  }
  LocaleConfig.defaultLocale = language;
}

export interface MonthCalendarProps {
  /** Selected day (YYYY-MM-DD). */
  selected: string | null;
  onSelect: (date: string) => void;
  /** First and last day that can be chosen (the range the API accepts). */
  minDate?: string;
  maxDate?: string;
  /** Days that cannot be chosen (closed, no slots…), as the API reported them. */
  disabledDates?: readonly string[];
  /** Days with something (bookings in the agenda): a small dot. */
  markedDates?: readonly string[];
}

/**
 * Month view with swipe between months, in the app language and with the theme tokens. A
 * companion of the day strip (DayPicker) for choosing a day further ahead.
 */
export function MonthCalendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  disabledDates = [],
  markedDates = [],
}: MonthCalendarProps) {
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  applyCalendarLocale(language, t);
  const marked = useMemo(() => {
    const result: Record<
      string,
      { marked?: boolean; disabled?: boolean; disableTouchEvent?: boolean; selected?: boolean }
    > = {};
    for (const date of markedDates) result[date] = { ...result[date], marked: true };
    for (const date of disabledDates)
      result[date] = { ...result[date], disabled: true, disableTouchEvent: true };
    if (selected) result[selected] = { ...result[selected], selected: true };
    return result;
  }, [markedDates, disabledDates, selected]);

  return (
    <Calendar
      key={`${language}-${theme.scheme}`}
      current={selected ?? minDate}
      minDate={minDate}
      maxDate={maxDate}
      firstDay={1}
      enableSwipeMonths
      markedDates={marked}
      onDayPress={(day: DateData) => onSelect(day.dateString)}
      style={[styles.calendar, surface]}
      theme={{
        calendarBackground: 'transparent',
        textSectionTitleColor: theme.colors.textSecondary,
        selectedDayBackgroundColor: theme.colors.primary,
        selectedDayTextColor: theme.colors.onPrimary,
        todayTextColor: theme.colors.primary,
        dayTextColor: theme.colors.textPrimary,
        textDisabledColor: theme.colors.textMuted,
        dotColor: theme.colors.primary,
        selectedDotColor: theme.colors.onPrimary,
        arrowColor: theme.colors.primary,
        monthTextColor: theme.colors.textPrimary,
        textDayFontFamily: fontFamily.medium,
        textMonthFontFamily: fontFamily.semibold,
        textDayHeaderFontFamily: fontFamily.medium,
        textDayFontSize: typography.body.fontSize,
        textMonthFontSize: typography.subtitle.fontSize,
        textDayHeaderFontSize: typography.caption.fontSize,
      }}
      testID="month-calendar"
    />
  );
}

const styles = StyleSheet.create({
  calendar: { overflow: 'hidden' },
});
