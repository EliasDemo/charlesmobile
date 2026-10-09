import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Button, Card, Notice, QueryView, Screen, SwitchRow, Text, TimeStepper } from '@/shared/ui';
import { WEEK_ORDER, useWeekSchedule } from '../hooks/useWeekSchedule';

export interface ScheduleScreenProps {
  shopId: string;
  /** A barber's own schedule; without it, the barbershop's hours. */
  barberId?: string;
  /** The barber themself can only read it (managers change it). */
  readOnly?: boolean;
}

/** Weekly hours: several windows per day (breaks), in steps of 5 minutes, in the barbershop's zone. */
export function ScheduleScreen({ shopId, barberId, readOnly = false }: ScheduleScreenProps) {
  const { t } = useTranslation('shop');
  const [saved, setSaved] = useState<string | null>(null);
  const days = t('days', { ns: 'common', returnObjects: true }) as readonly string[];
  const s = useWeekSchedule(shopId, barberId, { onSaved: setSaved });
  return (
    <Screen>
      <QueryView query={s.query}>
        {() => (
          <View style={styles.content}>
            {s.timezone ? (
              <Text variant="caption" color="textMuted">
                {t('hours.timezone', { timezone: s.timezone })}
              </Text>
            ) : null}
            {readOnly ? <Notice tone="info" message={t('hours.readOnly')} /> : null}
            {s.isBarber ? (
              <View>
                <SwitchRow
                  title={t('hours.inherit')}
                  subtitle={t('hours.inheritHint')}
                  value={s.inherits}
                  onValueChange={s.setInherits}
                  disabled={readOnly}
                />
              </View>
            ) : null}
            {s.week && !(s.isBarber && s.inherits)
              ? WEEK_ORDER.map((day) => {
                  const windows = s.week![day] ?? [];
                  return (
                    <Card key={day}>
                      <SwitchRow
                        title={days[day] ?? ''}
                        subtitle={windows.length ? t('hours.open') : t('hours.closed')}
                        value={windows.length > 0}
                        onValueChange={(open) => s.toggleDay(day, open)}
                        disabled={readOnly}
                      />
                      {windows.map((window, index) => (
                        <View key={index} style={styles.window}>
                          <View style={styles.row}>
                            <TimeStepper
                              label={t('hours.from')}
                              value={window.start}
                              onChange={(start) => !readOnly && s.setWindow(day, index, { ...window, start })}
                            />
                            <TimeStepper
                              label={t('hours.to')}
                              value={window.end}
                              onChange={(end) => !readOnly && s.setWindow(day, index, { ...window, end })}
                            />
                          </View>
                          {!readOnly && windows.length > 1 ? (
                            <Button
                              label={t('hours.removeWindow')}
                              variant="ghost"
                              onPress={() => s.removeWindow(day, index)}
                            />
                          ) : null}
                        </View>
                      ))}
                      {!readOnly && windows.length > 0 ? (
                        <Button
                          label={t('hours.addWindow')}
                          variant="ghost"
                          onPress={() => s.addWindow(day)}
                        />
                      ) : null}
                    </Card>
                  );
                })
              : null}
            {s.invalid ? <Notice tone="danger" message={t('hours.invalidWindow')} /> : null}
            {saved ? <Notice tone="success" message={saved} /> : null}
            {s.error ? <Notice tone="danger" message={s.error} /> : null}
            {readOnly ? null : (
              <Button label={t('hours.save')} onPress={s.save} loading={s.isSaving} fullWidth />
            )}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  window: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
});
