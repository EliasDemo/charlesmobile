import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate, formatTime } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import {
  Button,
  Chip,
  ConfirmDialog,
  DateSelector,
  IconTile,
  InfoCard,
  Notice,
  QueryView,
  Screen,
  Text,
  TextField,
  TimeStepper,
  type IconName,
} from '@/shared/ui';
import type { TimeBlockType } from '../api/shopApi';
import { useManagedShop } from '../hooks/useManagedShop';
import { useTimeBlockForm, useTimeBlocks } from '../hooks/useTimeBlocks';
import { LIMITS } from '../schemas/limits';

const TYPES: TimeBlockType[] = ['BREAK', 'ABSENCE', 'HOLIDAY', 'MANUAL'];
const TYPE_ICON: Record<TimeBlockType, IconName> = {
  BREAK: 'cafe',
  ABSENCE: 'person-remove',
  HOLIDAY: 'flag',
  MANUAL: 'lock-closed',
};

export function TimeBlocksScreen({
  shopId,
  ownBarberId,
  timeZone,
  onNew,
}: {
  shopId: string;
  ownBarberId?: string;
  /** Known for a barber's own blocks (from /me/barber); otherwise read from the barbershop. */
  timeZone?: string;
  onNew: () => void;
}) {
  const { t } = useTranslation('shop');
  const shop = useManagedShop(shopId);
  const zone = timeZone ?? shop.data?.timezone;
  const b = useTimeBlocks(shopId, zone, ownBarberId);
  const barberName = (id: string | null) =>
    id ? (b.barbers.find((x) => x.id === id)?.displayName ?? '') : t('blocks.allShop');
  return (
    <Screen>
      <Button label={t('blocks.new')} onPress={onNew} fullWidth />
      {b.deleteError ? <Notice tone="danger" message={b.deleteError} /> : null}
      <QueryView
        query={b.blocks}
        skeletonCount={2}
        isEmpty={(list) => list.length === 0}
        empty={{ title: t('blocks.empty'), icon: 'calendar-clear-outline' }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((block) => (
              <InfoCard
                key={block.id}
                leading={<IconTile icon={TYPE_ICON[block.type]} />}
                title={t(`blocks.types.${block.type}`)}
                subtitle={ownBarberId ? undefined : barberName(block.barberId)}
                details={[
                  {
                    icon: 'time',
                    text: t('blocks.range', {
                      date: formatShortDate(block.startAt, block.timezone),
                      from: formatTime(block.startAt, block.timezone),
                      to: formatTime(block.endAt, block.timezone),
                    }),
                  },
                  ...(block.reason ? [{ icon: 'chatbox-ellipses' as const, text: block.reason }] : []),
                ]}
                footer={
                  <Button label={t('blocks.delete')} variant="ghost" onPress={() => b.askDelete(block)} />
                }
              />
            ))}
          </View>
        )}
      </QueryView>
      <ConfirmDialog
        visible={b.deleting !== null}
        title={t('blocks.deleteTitle')}
        message={t('blocks.deleteMessage')}
        confirmLabel={t('blocks.deleteConfirm')}
        onConfirm={b.confirmDelete}
        onCancel={b.cancelDelete}
        loading={b.isDeleting}
        destructive
      />
    </Screen>
  );
}

export function TimeBlockFormScreen({
  shopId,
  ownBarberId,
  timeZone,
  onDone,
}: {
  shopId: string;
  ownBarberId?: string;
  timeZone?: string;
  onDone: () => void;
}) {
  const shop = useManagedShop(shopId);
  const zone = timeZone ?? shop.data?.timezone;
  return (
    <Screen>
      {zone ? (
        <BlockForm shopId={shopId} timeZone={zone} ownBarberId={ownBarberId} onDone={onDone} />
      ) : (
        <QueryView query={shop}>{() => null}</QueryView>
      )}
    </Screen>
  );
}

function BlockForm({
  shopId,
  timeZone,
  ownBarberId,
  onDone,
}: {
  shopId: string;
  timeZone: string;
  ownBarberId?: string;
  onDone: () => void;
}) {
  const { t } = useTranslation('shop');
  const list = useTimeBlocks(shopId, timeZone, ownBarberId);
  const f = useTimeBlockForm(shopId, timeZone, { ownBarberId, onDone });
  return (
    <View style={styles.content}>
      {f.fixedBarber ? null : (
        <View style={styles.section}>
          <Text variant="label" color="textSecondary">
            {t('blocks.who')}
          </Text>
          <View style={styles.chips}>
            <Chip
              label={t('blocks.allShop')}
              selected={f.barberId === null}
              onPress={() => f.setBarberId(null)}
            />
            {list.barbers.map((barber) => (
              <Chip
                key={barber.id}
                label={barber.displayName}
                selected={f.barberId === barber.id}
                onPress={() => f.setBarberId(barber.id)}
              />
            ))}
          </View>
        </View>
      )}
      <View style={styles.section}>
        <Text variant="label" color="textSecondary">
          {t('blocks.type')}
        </Text>
        <View style={styles.chips}>
          {TYPES.map((type) => (
            <Chip
              key={type}
              label={t(`blocks.types.${type}`)}
              selected={f.type === type}
              onPress={() => f.setType(type)}
            />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Text variant="label" color="textSecondary">
          {t('blocks.day')}
        </Text>
        <DateSelector
          label={t('blocks.day')}
          days={f.days}
          selected={f.date}
          onSelect={(d) => d && f.setDate(d)}
        />
      </View>
      <View style={styles.row}>
        <TimeStepper label={t('blocks.from')} value={f.from} onChange={f.setFrom} />
        <TimeStepper label={t('blocks.to')} value={f.to} onChange={f.setTo} />
      </View>
      <Text variant="caption" color="textMuted">
        {t('hours.timezone', { timezone: timeZone })}
      </Text>
      <TextField
        label={t('blocks.reason')}
        maxLength={LIMITS.blockReason.max}
        hint={t('blocks.reasonHint')}
        value={f.reason}
        onChangeText={f.setReason}
      />
      {f.error ? <Notice tone="danger" message={f.error} /> : null}
      <Button label={t('blocks.save')} onPress={f.save} loading={f.isSaving} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  list: { gap: spacing.md },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
});
