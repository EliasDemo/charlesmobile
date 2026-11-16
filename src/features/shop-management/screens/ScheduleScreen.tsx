import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Button,
  Chip,
  GuideBanner,
  Icon,
  Notice,
  QueryView,
  Screen,
  SwitchRow,
  Text,
  toMinutes,
  useSurfaceStyle,
  type GuideStep,
  type IconName,
} from '@/shared/ui';
import {
  TIME_OPTIONS,
  WEEK_ORDER,
  useWeekSchedule,
  type ScheduleTemplate,
  type Week,
  type Window,
} from '../hooks/useWeekSchedule';

type GuideText = { title: string; text: string; tip?: string };
/** The guide's steps (texts from the translations, one icon per step). */
const guideSteps = (texts: unknown, icons: IconName[]): GuideStep[] =>
  (texts as GuideText[]).map((s, i) => ({ ...s, icon: icons[i] ?? 'help-circle' }));

export interface ScheduleScreenProps {
  shopId: string;
  /** A barber's own schedule; without it, the barbershop's hours. */
  barberId?: string;
  /** The barber themself can only read it (managers change it). */
  readOnly?: boolean;
}

const WEEKDAYS = [1, 2, 3, 4, 5] as const;
const TEMPLATES: ScheduleTemplate[] = ['weekdays', 'monSat', 'everyDay'];
const DAY_MINUTES = 24 * 60;

/**
 * Weekly hours, made simple: a summary of the week, templates in one tap, a switch per day and
 * hours chosen from a list (every 30 minutes). Breaks split a day in two windows. The hours are
 * those of the barbershop's zone.
 */
export function ScheduleScreen({ shopId, barberId, readOnly = false }: ScheduleScreenProps) {
  const { t } = useTranslation('shop');
  const [saved, setSaved] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ day: number; index: number; edge: keyof Window } | null>(null);
  const days = t('days', { ns: 'common', returnObjects: true }) as readonly string[];
  const s = useWeekSchedule(shopId, barberId, { onSaved: setSaved });
  const editing = !readOnly && !(s.isBarber && s.inherits);
  const current = picking && s.week ? (s.week[picking.day] ?? [])[picking.index] : undefined;

  return (
    <Screen>
      <QueryView query={s.query}>
        {() => (
          <View style={styles.content}>
            {readOnly ? null : (
              <GuideBanner
                id="schedule"
                icon="time"
                title={t('guides.schedule.title')}
                summary={t('guides.schedule.summary')}
                steps={guideSteps(t('guides.schedule.steps', { returnObjects: true }), [
                  'storefront',
                  'cafe',
                  'copy',
                  'person',
                  'save',
                ])}
              />
            )}
            {readOnly ? <Notice tone="info" message={t('hours.readOnly')} /> : null}
            {s.isBarber ? (
              <SwitchRow
                title={t('hours.inherit')}
                subtitle={t('hours.inheritHint')}
                value={s.inherits}
                onValueChange={s.setInherits}
                disabled={readOnly}
              />
            ) : null}
            {s.week && !(s.isBarber && s.inherits) ? (
              <>
                <WeekSummary week={s.week} days={days} />
                {editing ? (
                  <View style={styles.section}>
                    <Text variant="label" color="textSecondary">
                      {t('hours.quick')}
                    </Text>
                    <View style={styles.chips}>
                      {TEMPLATES.map((template) => (
                        <Chip
                          key={template}
                          label={t(`hours.templates.${template}`)}
                          onPress={() => s.applyTemplate(template)}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
                {WEEK_ORDER.map((day) => (
                  <DayRow
                    key={day}
                    name={days[day] ?? ''}
                    windows={s.week![day] ?? []}
                    editable={editing}
                    onToggle={(open) => s.toggleDay(day, open)}
                    onPick={(index, edge) => setPicking({ day, index, edge })}
                    onAddBreak={() => s.addBreak(day)}
                    onAddWindow={() => s.addWindow(day)}
                    onRemoveWindow={(index) => s.removeWindow(day, index)}
                    onCopyAll={() => s.copyDay(day, WEEK_ORDER)}
                    onCopyWeekdays={() => s.copyDay(day, WEEKDAYS)}
                  />
                ))}
              </>
            ) : null}
            {s.timezone ? (
              <Text variant="caption" color="textMuted">
                {t('hours.timezone', { timezone: s.timezone })}
              </Text>
            ) : null}
            {s.invalid ? <Notice tone="danger" message={t('hours.invalidWindow')} /> : null}
            {saved ? <Notice tone="success" message={saved} /> : null}
            {s.error ? <Notice tone="danger" message={s.error} /> : null}
            {readOnly ? null : (
              <Button label={t('hours.save')} onPress={s.save} loading={s.isSaving} fullWidth />
            )}
          </View>
        )}
      </QueryView>
      <TimePicker
        visible={picking !== null}
        title={picking ? t(picking.edge === 'start' ? 'hours.from' : 'hours.to') : ''}
        value={current && picking ? current[picking.edge] : undefined}
        onPick={(time) => {
          if (picking && current)
            s.setWindow(picking.day, picking.index, { ...current, [picking.edge]: time });
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    </Screen>
  );
}

/** Seven bars, one per day, showing when it is open: the week at a glance. */
function WeekSummary({ week, days }: { week: Week; days: readonly string[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const short = t('daysShort', { returnObjects: true }) as readonly string[];
  return (
    <View style={[styles.summary, surface]} accessible accessibilityLabel={summaryLabel(week, days)}>
      {WEEK_ORDER.map((day) => (
        <View key={day} style={styles.summaryDay}>
          <View
            style={[
              styles.track,
              { backgroundColor: theme.colors.background, borderRadius: theme.radius.sm },
            ]}
          >
            {(week[day] ?? []).map((w, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    top: `${(toMinutes(w.start) / DAY_MINUTES) * 100}%`,
                    height: `${((toMinutes(w.end) - toMinutes(w.start)) / DAY_MINUTES) * 100}%`,
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius.sm,
                  },
                ]}
              />
            ))}
          </View>
          <Text variant="caption" color={(week[day] ?? []).length ? 'textPrimary' : 'textMuted'}>
            {short[day] ?? ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

const summaryLabel = (week: Week, days: readonly string[]) =>
  WEEK_ORDER.map((d) => {
    const windows = week[d] ?? [];
    return `${days[d]}: ${windows.length ? windows.map((w) => `${w.start}–${w.end}`).join(', ') : '—'}`;
  }).join('. ');

/** The backend accepts up to 6 windows a day (a break is two windows). */
const MAX_WINDOWS = 6;

function DayRow({
  name,
  windows,
  editable,
  onToggle,
  onPick,
  onAddBreak,
  onAddWindow,
  onRemoveWindow,
  onCopyAll,
  onCopyWeekdays,
}: {
  name: string;
  windows: Window[];
  editable: boolean;
  onToggle: (open: boolean) => void;
  onPick: (index: number, edge: keyof Window) => void;
  onAddBreak: () => void;
  onAddWindow: () => void;
  onRemoveWindow: (index: number) => void;
  onCopyAll: () => void;
  onCopyWeekdays: () => void;
}) {
  const { t } = useTranslation('shop');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const open = windows.length > 0;
  return (
    <View style={[styles.day, surface]}>
      <View style={styles.dayHeader}>
        <Text variant="bodyStrong" style={styles.flex}>
          {name.charAt(0).toUpperCase() + name.slice(1)}
        </Text>
        <Text variant="label" color={open ? 'success' : 'textMuted'}>
          {open ? t('hours.open') : t('hours.closed')}
        </Text>
        <Switch
          value={open}
          onValueChange={onToggle}
          disabled={!editable}
          accessibilityLabel={t('hours.toggleDay', { day: name })}
          trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        />
      </View>
      {windows.map((w, index) => (
        <View key={index} style={styles.windowRow}>
          <TimeButton
            value={w.start}
            label={t('hours.from')}
            disabled={!editable}
            onPress={() => onPick(index, 'start')}
          />
          <Icon name="arrow-forward" size={sizes.icon} color={theme.colors.textMuted} />
          <TimeButton
            value={w.end}
            label={t('hours.to')}
            disabled={!editable}
            onPress={() => onPick(index, 'end')}
          />
          {editable && windows.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('hours.removeWindow')}
              onPress={() => onRemoveWindow(index)}
              style={styles.iconButton}
            >
              <Icon name="close-circle" size={sizes.icon} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {editable && open ? (
        <View style={styles.chips}>
          {windows.length === 1 ? <Chip label={t('hours.addBreak')} onPress={onAddBreak} /> : null}
          {windows.length < MAX_WINDOWS ? <Chip label={t('hours.addWindow')} onPress={onAddWindow} /> : null}
          <Chip label={t('hours.copyWeekdays')} onPress={onCopyWeekdays} />
          <Chip label={t('hours.copyAll')} onPress={onCopyAll} />
        </View>
      ) : null}
    </View>
  );
}

/** A big button with the time ("09:00"): opens the list of times. */
function TimeButton({
  value,
  label,
  disabled,
  onPress,
}: {
  value: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.time,
        {
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text variant="subtitle">{value}</Text>
    </Pressable>
  );
}

/** The day's times every 30 minutes, big and easy to tap (no small wheels). */
function TimePicker({
  visible,
  title,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: string | undefined;
  onPick: (time: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const initial = Math.max(0, TIME_OPTIONS.indexOf(value ?? '09:00') - 2);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingBottom: spacing.md + insets.bottom,
            },
          ]}
        >
          <Text variant="title" align="center">
            {title}
          </Text>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={(time) => time}
            numColumns={4}
            initialScrollIndex={Math.floor(initial / 4)}
            getItemLayout={(_, index) => ({
              length: touchTarget + spacing.sm,
              offset: (touchTarget + spacing.sm) * index,
              index,
            })}
            columnWrapperStyle={styles.timeRow}
            renderItem={({ item }) => {
              const selected = item === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onPick(item)}
                  style={[
                    styles.timeOption,
                    {
                      borderRadius: theme.radius.md,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                    },
                  ]}
                >
                  <Text variant="bodyStrong" color={selected ? 'onPrimary' : 'textPrimary'}>
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flex: 1 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, gap: spacing.xs },
  summaryDay: { flex: 1, alignItems: 'center', gap: spacing.xs },
  track: { width: spacing.md, height: sizes.cover / 2, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, right: 0 },
  day: { padding: spacing.md, gap: spacing.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.borderWidth,
  },
  iconButton: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  timeRow: { gap: spacing.sm, marginBottom: spacing.sm },
  timeOption: { flex: 1, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
