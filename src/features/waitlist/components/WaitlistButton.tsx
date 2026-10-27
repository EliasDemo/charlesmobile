import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSession } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Button, Chip, ConfirmDialog, Notice, Text } from '@/shared/ui';
import { useJoinWaitlist, type WaitlistWindow } from '../hooks/useWaitlist';

const WINDOWS: WaitlistWindow[] = ['any', 'morning', 'afternoon', 'evening'];

export interface WaitlistButtonProps {
  barbershopId: string;
  serviceId: string;
  /** Local day of the barbershop (YYYY-MM-DD) with no free slots. */
  date: string;
  /** The barber chosen in "Reservar", if any: the person can keep them or take anyone. */
  barber: { id: string; name: string } | null;
  /** Without a session: ask for an account and come back here. */
  onRequireLogin: () => void;
}

/** "Avisarme si se libera un turno" on a day with no slots: part of the day and barber, then join. */
export function WaitlistButton({
  barbershopId,
  serviceId,
  date,
  barber,
  onRequireLogin,
}: WaitlistButtonProps) {
  const { t } = useTranslation('waitlist');
  const authenticated = useSession((s) => s.status === 'authenticated');
  const [open, setOpen] = useState(false);
  const [window, setWindow] = useState<WaitlistWindow>('any');
  const [onlyBarber, setOnlyBarber] = useState(Boolean(barber));
  const w = useJoinWaitlist(barbershopId, () => setOpen(false));
  return (
    <>
      <Button
        label={t('notify')}
        icon="notifications"
        variant="secondary"
        onPress={() => (authenticated ? setOpen(true) : onRequireLogin())}
        fullWidth
        testID="waitlist-open"
      />
      <ConfirmDialog
        visible={open}
        icon="notifications"
        title={t('sheet.title')}
        message={t('sheet.message')}
        confirmLabel={t('sheet.confirm')}
        loading={w.isJoining}
        onConfirm={() =>
          w.join({ serviceId, date, barberId: onlyBarber && barber ? barber.id : null, window })
        }
        onCancel={() => {
          w.clearError();
          setOpen(false);
        }}
      >
        <View style={styles.group}>
          <Text variant="label" color="textSecondary">
            {t('sheet.window')}
          </Text>
          <View style={styles.chips}>
            {WINDOWS.map((key) => (
              <Chip
                key={key}
                label={t(`windows.${key}`)}
                selected={window === key}
                onPress={() => setWindow(key)}
              />
            ))}
          </View>
        </View>
        {barber ? (
          <View style={styles.group}>
            <Text variant="label" color="textSecondary">
              {t('sheet.barber')}
            </Text>
            <View style={styles.chips}>
              <Chip
                label={t('sheet.onlyBarber', { name: barber.name })}
                selected={onlyBarber}
                onPress={() => setOnlyBarber(true)}
              />
              <Chip
                label={t('sheet.anyBarber')}
                selected={!onlyBarber}
                onPress={() => setOnlyBarber(false)}
              />
            </View>
          </View>
        ) : null}
        {w.error ? <Notice tone="danger" message={w.error} /> : null}
      </ConfirmDialog>
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
