import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { zonedTimeToIso, formatLongDate } from '@/shared/lib';
import { env } from '@/shared/config';
import { spacing } from '@/shared/theme';
import {
  Button,
  ConfirmDialog,
  InfoCard,
  IconTile,
  QueryView,
  Screen,
  StatusPill,
  type InfoItem,
} from '@/shared/ui';
import type { WaitlistEntry } from '../api/waitlistApi';
import { useMyWaitlist } from '../hooks/useWaitlist';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** "Mis listas de espera": what each one waits for, "Reservar ahora" once a slot opened, and leaving. */
export function MyWaitlistScreen({ onBook }: { onBook: (barbershopId: string, serviceId: string) => void }) {
  const { t } = useTranslation('waitlist');
  const w = useMyWaitlist();
  const [leaving, setLeaving] = useState<WaitlistEntry | null>(null);
  return (
    <Screen onRefresh={() => void w.query.refetch()} refreshing={w.query.isRefetching}>
      <QueryView
        query={{ ...w.query, data: w.items }}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('empty.title'), message: t('empty.message'), icon: 'notifications-outline' }}
      >
        {(items) => (
          <View style={styles.list}>
            {items.map((entry) => (
              <Entry
                key={entry.id}
                entry={entry}
                leaving={w.leavingId === entry.id}
                onBook={() => onBook(entry.barbershopId, entry.serviceId)}
                onLeave={() => setLeaving(entry)}
              />
            ))}
          </View>
        )}
      </QueryView>
      <ConfirmDialog
        visible={leaving !== null}
        title={t('leaveTitle')}
        message={t('leaveMessage')}
        confirmLabel={t('entry.leave')}
        destructive
        onConfirm={() => {
          if (leaving) w.leave(leaving.id);
          setLeaving(null);
        }}
        onCancel={() => setLeaving(null)}
      />
    </Screen>
  );
}

function Entry({
  entry,
  leaving,
  onBook,
  onLeave,
}: {
  entry: WaitlistEntry;
  leaving: boolean;
  onBook: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation('waitlist');
  // The day is the barbershop's local day; noon keeps it on the same date in any zone.
  const zone = env.defaultTimeZone;
  const details: InfoItem[] = [
    { icon: 'calendar', text: formatLongDate(zonedTimeToIso(entry.date, '12:00', zone), zone) },
    {
      icon: 'time',
      text:
        entry.fromMinute !== null && entry.toMinute !== null
          ? t('entry.window', { from: clock(entry.fromMinute), to: clock(entry.toMinute) })
          : t('entry.anyTime'),
    },
    { icon: 'person', text: entry.barberName ?? t('entry.anyBarber') },
  ];
  const notified = entry.status === 'NOTIFIED';
  return (
    <InfoCard
      testID={`waitlist-${entry.id}`}
      leading={
        <IconTile icon={notified ? 'notifications' : 'hourglass'} tone={notified ? 'success' : 'neutral'} />
      }
      title={entry.serviceName}
      subtitle={entry.barbershopName}
      details={details}
      footer={
        <View style={styles.footer}>
          <StatusPill
            tone={notified ? 'success' : 'pending'}
            icon={notified ? 'sparkles' : 'time'}
            label={t(`status.${entry.status as 'ACTIVE' | 'NOTIFIED'}`)}
          />
          <View style={styles.actions}>
            {notified ? <Button label={t('entry.book')} icon="calendar" onPress={onBook} /> : null}
            <Button label={t('entry.leave')} variant="ghost" onPress={onLeave} loading={leaving} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  footer: { gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
