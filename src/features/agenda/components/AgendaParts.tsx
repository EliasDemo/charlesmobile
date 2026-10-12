import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatTime } from '@/shared/lib';
import { sizes, spacing, useTheme, type StatusTone } from '@/shared/theme';
import {
  AnimatedNumber,
  Button,
  Icon,
  IconTile,
  Monogram,
  StatusPill,
  SwipeRow,
  Text,
  categoryIcon,
  useSurfaceStyle,
  type IconName,
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

const TONE_FG = {
  pending: 'statusPendingFg',
  success: 'statusSuccessFg',
  neutral: 'statusNeutralFg',
  danger: 'statusDangerFg',
} as const;

/** One figure of the day summary (citas, por marcar, atendidas). */
export function StatTile({
  icon,
  value,
  label,
  tone,
}: {
  icon: IconName;
  value: number;
  label: string;
  tone?: StatusTone;
}) {
  const surface = useSurfaceStyle();
  return (
    <View style={[styles.stat, surface]} accessible accessibilityLabel={`${value} ${label}`}>
      <IconTile icon={icon} tone={tone} />
      <AnimatedNumber variant="display" value={value} />
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Left column of the timeline: start and end time, and the rail with a dot of the state color. */
function TimeRail({
  start,
  end,
  tone,
  last,
}: {
  start: string;
  end: string;
  tone: StatusTone | null;
  last: boolean;
}) {
  const theme = useTheme();
  const dot = tone ? theme.colors[TONE_FG[tone]] : theme.colors.border;
  return (
    <View style={styles.railColumn}>
      <Text variant="bodyStrong">{start}</Text>
      <Text variant="caption" color="textMuted">
        {end}
      </Text>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: dot, borderColor: theme.colors.background }]} />
        {last ? null : <View style={[styles.line, { backgroundColor: theme.colors.border }]} />}
      </View>
    </View>
  );
}

export interface AgendaItemCardProps {
  item: AgendaItem;
  timeZone: string;
  showBarber: boolean;
  attending: boolean;
  last: boolean;
  onAttended: () => void;
  onNoShow: () => void;
  onCorrect: () => void;
  onCancel: () => void;
}

/** One booking of the day in the timeline. Its buttons are exactly the actions the API allows now. */
export function AgendaItemCard({
  item,
  timeZone,
  showBarber,
  attending,
  last,
  onAttended,
  onNoShow,
  onCorrect,
  onCancel,
}: AgendaItemCardProps) {
  const { t } = useTranslation('agenda');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const style = item.pendingAttention
    ? { tone: 'pending' as const, icon: 'alert-circle' as const, label: t('status.pendingAttention') }
    : { ...STATUS_STYLE[item.status], label: t(`status.${item.status}`) };
  const { canMarkAttended, canMarkNoShow, canCorrect, canCancel } = item.actions;
  const hasActions = canMarkAttended || canMarkNoShow || canCorrect || canCancel;
  const start = formatTime(item.startAt, timeZone);
  const end = formatTime(item.endAt, timeZone);
  return (
    <View style={styles.row} testID={`agenda-item-${item.bookingId}`}>
      <TimeRail start={start} end={end} tone={style.tone} last={last} />
      <View style={styles.flex}>
        <SwipeRow
          right={
            canMarkAttended
              ? {
                  label: t('actions.attended'),
                  icon: 'checkmark-done',
                  tone: 'success',
                  onTrigger: onAttended,
                }
              : undefined
          }
          left={
            canMarkNoShow
              ? { label: t('actions.noShow'), icon: 'person-remove', tone: 'danger', onTrigger: onNoShow }
              : undefined
          }
        >
          <View
            style={[
              styles.card,
              surface,
              item.pendingAttention
                ? { borderWidth: sizes.borderWidth, borderColor: theme.colors.warning }
                : null,
            ]}
          >
            <View style={styles.cardHeader}>
              <IconTile icon={categoryIcon(item.service.categoryKey)} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{item.service.name ?? ''}</Text>
                <Text variant="caption" color="textMuted">
                  {t('range', { from: start, to: end })}
                </Text>
              </View>
            </View>
            <StatusPill tone={style.tone} icon={style.icon} label={style.label} />
            <View style={styles.detail}>
              <Monogram
                name={item.client.name ?? ''}
                size={sizes.avatarSmall}
                imageUrl={item.client.photoUrl}
              />
              <Text variant="label" color="textSecondary" style={styles.flex}>
                {t('client', { name: item.client.name })}
              </Text>
            </View>
            {showBarber ? <Detail icon="cut" text={t('barber', { name: item.barber.name })} /> : null}
            {hasActions ? (
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
                {canCorrect ? (
                  <Button label={t('actions.correct')} variant="secondary" onPress={onCorrect} />
                ) : null}
                {canCancel ? <Button label={t('actions.cancel')} variant="ghost" onPress={onCancel} /> : null}
              </View>
            ) : null}
          </View>
        </SwipeRow>
      </View>
    </View>
  );
}

function Detail({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.detail}>
      <Icon name={icon} size={theme.typography.label.fontSize} color={theme.colors.textMuted} />
      <Text variant="label" color="textSecondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

/** A time block of the day (break, absence…), between the bookings, visually quieter. */
export function AgendaBlockCard({
  block,
  timeZone,
  barberName,
  last,
}: {
  block: AgendaBlock;
  timeZone: string;
  barberName: string | null;
  last: boolean;
}) {
  const { t } = useTranslation(['agenda', 'shop']);
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <TimeRail
        start={formatTime(block.startAt, timeZone)}
        end={formatTime(block.endAt, timeZone)}
        tone={null}
        last={last}
      />
      <View
        style={[
          styles.card,
          styles.block,
          {
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surfaceMuted,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <IconTile icon={BLOCK_ICON[block.type]} tone="neutral" />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t(`blocks.types.${block.type}`, { ns: 'shop' })}</Text>
            <Text variant="caption" color="textMuted">
              {block.barberId === null ? t('blockFor.shop') : (barberName ?? '')}
            </Text>
          </View>
        </View>
        {block.reason ? <Detail icon="chatbox-ellipses" text={block.reason} /> : null}
      </View>
    </View>
  );
}

const RAIL_WIDTH = 56;
const DOT = 12;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stat: { flex: 1, padding: spacing.md, gap: spacing.xxs },
  row: { flexDirection: 'row', gap: spacing.md },
  railColumn: { width: RAIL_WIDTH, alignItems: 'flex-end' },
  rail: { flex: 1, alignItems: 'center', alignSelf: 'flex-end', width: DOT, marginTop: spacing.xs },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: spacing.xxs },
  line: { flex: 1, width: spacing.xxs, marginTop: spacing.xxs },
  card: { flex: 1, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  block: { borderWidth: sizes.borderWidth, borderStyle: 'dashed' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
});
