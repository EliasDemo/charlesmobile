import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatTime } from '@/shared/lib';
import { spacing, type StatusTone } from '@/shared/theme';
import {
  Button,
  IconTile,
  InfoCard,
  StatusPill,
  categoryIcon,
  type IconName,
  type InfoItem,
} from '@/shared/ui';
import type { AgendaBlock, AgendaItem } from '../api/agendaApi';

const STATUS_STYLE: Record<AgendaItem['status'], { tone: StatusTone; icon: IconName }> = {
  PENDING_PAYMENT: { tone: 'pending', icon: 'time' },
  CONFIRMED: { tone: 'success', icon: 'checkmark-circle' },
  ATTENDED: { tone: 'neutral', icon: 'checkmark-done' },
  NO_SHOW: { tone: 'danger', icon: 'person-remove' },
  CANCELLED: { tone: 'danger', icon: 'close-circle' },
  EXPIRED: { tone: 'neutral', icon: 'hourglass' },
};

const BLOCK_ICON: Record<AgendaBlock['type'], IconName> = {
  BREAK: 'cafe',
  ABSENCE: 'person-remove',
  HOLIDAY: 'flag',
  MANUAL: 'lock-closed',
};

export interface AgendaItemCardProps {
  item: AgendaItem;
  timeZone: string;
  showBarber: boolean;
  attending: boolean;
  onAttended: () => void;
  onNoShow: () => void;
  onCorrect: () => void;
}

/** One booking of the day. Its buttons are exactly the actions the API allows now. */
export function AgendaItemCard({
  item,
  timeZone,
  showBarber,
  attending,
  onAttended,
  onNoShow,
  onCorrect,
}: AgendaItemCardProps) {
  const { t } = useTranslation('agenda');
  const style = item.pendingAttention
    ? { tone: 'pending' as const, icon: 'alert-circle' as const, label: t('status.pendingAttention') }
    : { ...STATUS_STYLE[item.status], label: t(`status.${item.status}`) };
  const details: InfoItem[] = [
    {
      icon: 'time',
      text: t('range', { from: formatTime(item.startAt, timeZone), to: formatTime(item.endAt, timeZone) }),
    },
    { icon: 'person', text: t('client', { name: item.client.name }) },
  ];
  if (showBarber) details.push({ icon: 'cut', text: t('barber', { name: item.barber.name }) });
  const { canMarkAttended, canMarkNoShow, canCorrect } = item.actions;
  const hasActions = canMarkAttended || canMarkNoShow || canCorrect;
  return (
    <InfoCard
      testID={`agenda-item-${item.bookingId}`}
      leading={<IconTile icon={categoryIcon(item.service.categoryKey)} />}
      title={item.service.name ?? ''}
      details={details}
      trailing={<StatusPill tone={style.tone} icon={style.icon} label={style.label} />}
      footer={
        hasActions ? (
          <View style={styles.actions}>
            {canMarkAttended ? (
              <Button label={t('actions.attended')} onPress={onAttended} loading={attending} />
            ) : null}
            {canMarkNoShow ? (
              <Button
                label={t('actions.noShow')}
                variant="secondary"
                onPress={onNoShow}
                disabled={attending}
              />
            ) : null}
            {canCorrect ? <Button label={t('actions.correct')} variant="ghost" onPress={onCorrect} /> : null}
          </View>
        ) : undefined
      }
    />
  );
}

/** A time block of the day (break, absence…), between the bookings. */
export function AgendaBlockCard({
  block,
  timeZone,
  barberName,
}: {
  block: AgendaBlock;
  timeZone: string;
  barberName: string | null;
}) {
  const { t } = useTranslation(['agenda', 'shop']);
  return (
    <InfoCard
      leading={<IconTile icon={BLOCK_ICON[block.type]} />}
      title={t(`blocks.types.${block.type}`, { ns: 'shop' })}
      subtitle={block.barberId === null ? t('blockFor.shop') : (barberName ?? undefined)}
      details={[
        {
          icon: 'time',
          text: t('range', {
            from: formatTime(block.startAt, timeZone),
            to: formatTime(block.endAt, timeZone),
          }),
        },
        ...(block.reason ? [{ icon: 'chatbox-ellipses' as const, text: block.reason }] : []),
      ]}
    />
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
