import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate, formatMoney, formatTime, zonedTimeToIso } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import {
  Chip,
  ConfirmDialog,
  DayPicker,
  EmptyState,
  Notice,
  QueryView,
  FadeIn,
  Screen,
  ScreenTitle,
  SegmentedControl,
  Text,
  TextField,
} from '@/shared/ui';
import type { Agenda, AgendaBlock, AgendaItem } from '../api/agendaApi';
import { AgendaBlockCard, AgendaItemCard, StatTile } from '../components/AgendaParts';
import { REASON_MAX, useAgenda } from '../hooks/useAgenda';

type Row = { kind: 'item'; item: AgendaItem } | { kind: 'block'; block: AgendaBlock };

/** Bookings and blocks of the day in one timeline, by start time. */
function timeline(agenda: Agenda): Row[] {
  const rows: Row[] = [
    ...agenda.items.map((item) => ({ kind: 'item' as const, item })),
    ...agenda.blocks.map((block) => ({ kind: 'block' as const, block })),
  ];
  const start = (row: Row) => (row.kind === 'item' ? row.item.startAt : row.block.startAt);
  return rows.sort((a, b) => start(a).localeCompare(start(b)));
}

/** Agenda tab of the barbershop mode: the day's bookings and the attendance actions. */
export function AgendaScreen({ headerRight }: { headerRight?: ReactNode }) {
  const { t } = useTranslation('agenda');
  const a = useAgenda();

  return (
    <Screen edges={['top', 'left', 'right']} onRefresh={a.refresh} refreshing={a.isRefreshing}>
      <ScreenTitle title={t('title')} right={headerRight} />
      <QueryView query={a.access} skeletonCount={2}>
        {() =>
          !a.hasAccess ? (
            <EmptyState icon="calendar-outline" title={t('noAccess')} />
          ) : (
            <View style={styles.content}>
              {a.canSwitch ? (
                <SegmentedControl
                  label={t('view.label')}
                  value={a.view}
                  onChange={a.setView}
                  options={[
                    { value: 'shop', label: t('view.shop') },
                    { value: 'mine', label: t('view.mine') },
                  ]}
                />
              ) : null}
              {a.view === 'shop' && a.shops.length > 1 ? (
                <ChipRow label={t('shopLabel')}>
                  {a.shops.map((shop) => (
                    <Chip
                      key={shop.id}
                      label={shop.name}
                      selected={shop.id === a.shopId}
                      onPress={() => a.selectShop(shop.id)}
                    />
                  ))}
                </ChipRow>
              ) : null}
              <DayPicker
                label={t('day')}
                days={a.days}
                today={a.today}
                selected={a.date}
                onSelect={(date) => date && a.setDate(date)}
                required
              />
              {a.barbers.length > 1 ? (
                <ChipRow label={t('barberLabel')}>
                  <Chip
                    label={t('allBarbers')}
                    selected={a.barberId === null}
                    onPress={() => a.setBarberId(null)}
                  />
                  {a.barbers.map((barber) => (
                    <Chip
                      key={barber.id}
                      label={barber.displayName}
                      selected={a.barberId === barber.id}
                      onPress={() => a.setBarberId(barber.id)}
                    />
                  ))}
                </ChipRow>
              ) : null}
              <View style={styles.dayHeader}>
                <Text variant="subtitle" style={styles.capitalize}>
                  {formatLongDate(zonedTimeToIso(a.date, '12:00', a.timeZone), a.timeZone)}
                </Text>
                <Text variant="caption" color="textMuted">
                  {t('timezone', { timezone: a.timeZone })}
                </Text>
              </View>
              {a.actionError ? <Notice tone="danger" message={a.actionError} /> : null}
              {a.cancelled ? (
                <Notice
                  tone="success"
                  message={
                    a.cancelled.refund.amount.amount > 0
                      ? t('cancelDialog.doneRefund', { amount: formatMoney(a.cancelled.refund.amount) })
                      : t('cancelDialog.done')
                  }
                />
              ) : null}
              <QueryView
                query={a.agenda}
                skeletonCount={3}
                isEmpty={(agenda) => agenda.items.length === 0 && agenda.blocks.length === 0}
                empty={{ title: t('empty'), icon: 'calendar-clear-outline' }}
              >
                {(agenda) => (
                  <View style={styles.list}>
                    <View style={styles.stats}>
                      <StatTile icon="calendar" value={agenda.items.length} label={t('stats.bookings')} />
                      <StatTile
                        icon="alert-circle"
                        value={agenda.pendingAttention}
                        label={t('stats.pending')}
                        tone={agenda.pendingAttention > 0 ? 'pending' : 'neutral'}
                      />
                      <StatTile
                        icon="checkmark-done"
                        value={agenda.items.filter((item) => item.status === 'ATTENDED').length}
                        label={t('stats.attended')}
                        tone="success"
                      />
                    </View>
                    {agenda.pendingAttention > 0 ? (
                      <Notice tone="warning" message={t('pending', { count: agenda.pendingAttention })} />
                    ) : null}
                    <View>
                      {timeline(agenda).map((row, index, rows) => (
                        <FadeIn key={row.kind === 'item' ? row.item.bookingId : row.block.id} index={index}>
                          {row.kind === 'item' ? (
                            <AgendaItemCard
                              key={row.item.bookingId}
                              item={row.item}
                              timeZone={agenda.timezone}
                              showBarber={a.view === 'shop' && a.barberId === null}
                              attending={a.attendingId === row.item.bookingId}
                              onAttended={() => a.markAttended(row.item)}
                              onNoShow={() => a.askNoShow(row.item)}
                              onCorrect={() => a.askCorrection(row.item)}
                              onCancel={() => a.askCancel(row.item)}
                              last={index === rows.length - 1}
                            />
                          ) : (
                            <AgendaBlockCard
                              key={row.block.id}
                              block={row.block}
                              timeZone={agenda.timezone}
                              last={index === rows.length - 1}
                              barberName={
                                a.barbers.find((barber) => barber.id === row.block.barberId)?.displayName ??
                                null
                              }
                            />
                          )}
                        </FadeIn>
                      ))}
                    </View>
                  </View>
                )}
              </QueryView>
            </View>
          )
        }
      </QueryView>

      <ConfirmDialog
        visible={a.noShowItem !== null}
        title={t('noShowDialog.title')}
        message={
          a.noShowItem
            ? t('noShowDialog.message', {
                client: a.noShowItem.client.name,
                time: formatTime(a.noShowItem.startAt, a.timeZone),
              })
            : ''
        }
        confirmLabel={t('noShowDialog.confirm')}
        onConfirm={a.confirmNoShow}
        onCancel={a.cancelNoShow}
        loading={a.isMarkingNoShow}
        destructive
      />
      <ConfirmDialog
        visible={a.correcting !== null}
        title={t('correctionDialog.title')}
        message={
          a.correcting
            ? t(
                a.correcting.status === 'ATTENDED'
                  ? 'correctionDialog.toNoShow'
                  : 'correctionDialog.toAttended',
                {
                  client: a.correcting.client.name,
                },
              )
            : ''
        }
        confirmLabel={t('correctionDialog.confirm')}
        onConfirm={a.confirmCorrection}
        onCancel={a.cancelCorrection}
        loading={a.isCorrecting}
        confirmDisabled={!a.reasonValid}
      >
        <TextField
          label={t('correctionDialog.reason')}
          hint={t('correctionDialog.reasonHint')}
          value={a.reason}
          onChangeText={a.setReason}
          maxLength={REASON_MAX}
          multiline
        />
      </ConfirmDialog>
      <ConfirmDialog
        visible={a.cancelling !== null}
        title={t('cancelDialog.title')}
        message={
          a.cancelling
            ? t('cancelDialog.message', {
                client: a.cancelling.client.name,
                time: formatTime(a.cancelling.startAt, a.timeZone),
              })
            : ''
        }
        confirmLabel={t('cancelDialog.confirm')}
        onConfirm={a.confirmCancel}
        onCancel={a.dismissCancel}
        loading={a.isCancelling}
        confirmDisabled={!a.cancelReasonValid}
        destructive
      >
        <TextField
          label={t('cancelDialog.reason')}
          hint={t('cancelDialog.reasonHint')}
          value={a.cancelReason}
          onChangeText={a.setCancelReason}
          maxLength={REASON_MAX}
          multiline
        />
      </ConfirmDialog>
    </Screen>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      accessibilityLabel={label}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  list: { gap: spacing.md },
  chips: { gap: spacing.sm, paddingVertical: spacing.xxs },
  stats: { flexDirection: 'row', gap: spacing.sm },
  dayHeader: { gap: spacing.xxs },
  capitalize: { textTransform: 'capitalize' },
});
