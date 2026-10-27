import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate, parseSoles } from '@/shared/lib';
import { sizes, spacing } from '@/shared/theme';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  FilterGroup,
  Monogram,
  Notice,
  QueryView,
  Screen,
  StatusPill,
  Text,
  TextField,
  type IconName,
} from '@/shared/ui';
import type { EmploymentType, JobOffer } from '../api/jobsApi';
import { JobFact, jobPayText } from '../components/JobParts';
import { EMPLOYMENT_TYPES, OFFER_DAYS, useCreateOffer, useMyOffers, useShopOffers } from '../hooks/useJobs';

const zone = env.defaultTimeZone;

const STATUS: Record<
  JobOffer['status'],
  { tone: 'pending' | 'success' | 'neutral' | 'danger'; icon: IconName }
> = {
  PENDING: { tone: 'pending', icon: 'hourglass' },
  ACCEPTED: { tone: 'success', icon: 'checkmark-circle' },
  REJECTED: { tone: 'danger', icon: 'close-circle' },
  WITHDRAWN: { tone: 'neutral', icon: 'arrow-undo' },
  EXPIRED: { tone: 'neutral', icon: 'time' },
};

function OfferCard({
  offer,
  side,
  children,
}: {
  offer: JobOffer;
  side: 'me' | 'shop';
  children?: React.ReactNode;
}) {
  const { t } = useTranslation('jobs');
  const pay = jobPayText(offer, t);
  const style = STATUS[offer.status];
  return (
    <Card style={styles.card} testID={`offer-${offer.id}`}>
      <View style={styles.top}>
        <Monogram
          name={side === 'me' ? offer.barbershop.name : offer.barberName}
          size={sizes.avatar}
          imageUrl={side === 'me' ? offer.barbershop.logoUrl : null}
        />
        <View style={styles.flex}>
          <Text variant="caption" color="textSecondary">
            {side === 'me' ? offer.barbershop.name : t('offers.to', { name: offer.barberName })}
          </Text>
          <Text variant="subtitle">{offer.title}</Text>
        </View>
      </View>
      <StatusPill tone={style.tone} icon={style.icon} label={t(`offers.status.${offer.status}`)} />
      <JobFact icon="briefcase" text={t(`types.${offer.employmentType}`)} />
      {pay ? <JobFact icon="cash" text={pay} strong /> : null}
      {offer.schedule ? <JobFact icon="calendar" text={offer.schedule} /> : null}
      {offer.message ? <Text color="textSecondary">{`“${offer.message}”`}</Text> : null}
      {offer.status === 'PENDING' ? (
        <JobFact icon="time" text={t('offers.expires', { date: formatShortDate(offer.expiresAt, zone) })} />
      ) : null}
      {offer.responseNote ? (
        <Text variant="caption" color="textSecondary">
          {t('offers.note', { note: offer.responseNote })}
        </Text>
      ) : null}
      {children}
    </Card>
  );
}

/** "Ofertas para ti": barbershops that want the barber; accepting joins their team. */
export function MyOffersScreen({ onAccepted }: { onAccepted: () => void }) {
  const { t } = useTranslation('jobs');
  const o = useMyOffers({ onAccepted });
  const [accepting, setAccepting] = useState<JobOffer | null>(null);
  const [rejecting, setRejecting] = useState<JobOffer | null>(null);
  const [note, setNote] = useState('');
  return (
    <Screen refreshing={o.query.isRefetching} onRefresh={() => void o.query.refetch()}>
      <Text color="textSecondary">{t('offers.intro')}</Text>
      {o.error ? <Notice tone="danger" message={o.error} /> : null}
      <QueryView
        query={o.query}
        isEmpty={(list) => list.length === 0}
        empty={{ title: t('offers.empty'), message: t('offers.emptyMessage'), icon: 'mail-open-outline' }}
      >
        {() => (
          <View style={styles.list}>
            {o.items.map((offer) => (
              <OfferCard key={offer.id} offer={offer} side="me">
                {offer.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <Button
                      label={t('offers.accept')}
                      icon="checkmark"
                      onPress={() => setAccepting(offer)}
                      loading={o.busyId === offer.id}
                      fullWidth
                    />
                    <Button
                      label={t('offers.reject')}
                      variant="ghost"
                      onPress={() => setRejecting(offer)}
                      disabled={o.busyId === offer.id}
                    />
                  </View>
                ) : null}
              </OfferCard>
            ))}
          </View>
        )}
      </QueryView>
      <ConfirmDialog
        visible={accepting !== null}
        icon="briefcase"
        title={t('offers.acceptTitle')}
        message={t('offers.acceptMessage', { shop: accepting?.barbershop.name ?? '' })}
        confirmLabel={t('offers.accept')}
        onConfirm={() => {
          if (accepting) o.accept(accepting.id);
          setAccepting(null);
        }}
        onCancel={() => setAccepting(null)}
      />
      <ConfirmDialog
        visible={rejecting !== null}
        title={t('offers.rejectTitle')}
        message={t('offers.rejectMessage', { shop: rejecting?.barbershop.name ?? '' })}
        confirmLabel={t('offers.reject')}
        destructive
        onConfirm={() => {
          if (rejecting) o.reject(rejecting.id, note);
          setRejecting(null);
          setNote('');
        }}
        onCancel={() => setRejecting(null)}
      >
        <TextField label={t('offers.noteLabel')} value={note} onChangeText={setNote} maxLength={300} />
      </ConfirmDialog>
    </Screen>
  );
}

/** Offers the barbershop sent, with their answer; pending ones can be withdrawn. */
export function ShopOffersScreen({ shopId }: { shopId: string }) {
  const { t } = useTranslation('jobs');
  const o = useShopOffers(shopId);
  return (
    <Screen refreshing={o.query.isRefetching} onRefresh={() => void o.query.refetch()}>
      {o.error ? <Notice tone="danger" message={o.error} /> : null}
      <QueryView
        query={o.query}
        isEmpty={(list) => list.length === 0}
        empty={{
          title: t('offers.shopEmpty'),
          message: t('offers.shopEmptyMessage'),
          icon: 'paper-plane-outline',
        }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((offer) => (
              <OfferCard key={offer.id} offer={offer} side="shop">
                {offer.status === 'PENDING' ? (
                  <Button
                    label={t('offers.withdraw')}
                    variant="ghost"
                    onPress={() => o.withdraw(offer.id)}
                    loading={o.withdrawingId === offer.id}
                  />
                ) : null}
              </OfferCard>
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

type Period = 'MONTH' | 'WEEK' | 'DAY' | 'PER_SERVICE';
const PERIODS: Period[] = ['MONTH', 'WEEK', 'DAY', 'PER_SERVICE'];

/** "Ofrecer trabajo" to one barber: what, how much and until when. */
export function OfferJobScreen({
  shopId,
  barberProfileId,
  barberName,
  onSent,
}: {
  shopId: string;
  barberProfileId: string;
  barberName: string;
  onSent: () => void;
}) {
  const { t } = useTranslation('jobs');
  const c = useCreateOffer(shopId, { onSent });
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EmploymentType>('FULL_TIME');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [period, setPeriod] = useState<Period>('MONTH');
  const [schedule, setSchedule] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState<number>(7);
  const payMin = min.trim() ? parseSoles(min) : null;
  const payMax = max.trim() ? parseSoles(max) : null;
  const payInvalid =
    (min.trim() !== '' && payMin === null) ||
    (max.trim() !== '' && payMax === null) ||
    (payMin !== null && payMax !== null && payMin > payMax);
  const valid = title.trim().length >= 5 && !payInvalid;
  return (
    <Screen>
      <Text color="textSecondary">{t('offers.newIntro', { name: barberName })}</Text>
      {c.error ? <Notice tone="danger" message={c.error} /> : null}
      <TextField label={t('form.title')} value={title} onChangeText={setTitle} maxLength={80} />
      <FilterGroup title={t('form.type')}>
        {EMPLOYMENT_TYPES.map((k) => (
          <Chip key={k} label={t(`types.${k}`)} selected={type === k} onPress={() => setType(k)} />
        ))}
      </FilterGroup>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={t('offers.payMin')}
            value={min}
            onChangeText={setMin}
            keyboardType="decimal-pad"
            prefix={<Text color="textMuted">{t('offers.currency')}</Text>}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label={t('offers.payMax')}
            value={max}
            onChangeText={setMax}
            keyboardType="decimal-pad"
            prefix={<Text color="textMuted">{t('offers.currency')}</Text>}
          />
        </View>
      </View>
      {payInvalid ? <Notice tone="warning" message={t('offers.payInvalid')} /> : null}
      <FilterGroup title={t('offers.period')}>
        {PERIODS.map((p) => (
          <Chip key={p} label={t(`pay.period.${p}`)} selected={period === p} onPress={() => setPeriod(p)} />
        ))}
      </FilterGroup>
      <TextField
        label={t('offers.schedule')}
        hint={t('offers.scheduleHint')}
        value={schedule}
        onChangeText={setSchedule}
        maxLength={120}
      />
      <TextField
        label={t('offers.message')}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={500}
      />
      <FilterGroup title={t('offers.days')}>
        {OFFER_DAYS.map((d) => (
          <Chip
            key={d}
            label={t('offers.daysValue', { count: d })}
            selected={days === d}
            onPress={() => setDays(d)}
          />
        ))}
      </FilterGroup>
      <Button
        label={t('offers.send')}
        icon="paper-plane"
        disabled={!valid}
        loading={c.isSending}
        fullWidth
        onPress={() =>
          c.send({
            barberProfileId,
            title: title.trim(),
            employmentType: type,
            expiresInDays: days,
            ...(message.trim() ? { message: message.trim() } : {}),
            ...(schedule.trim() ? { schedule: schedule.trim() } : {}),
            ...(payMin !== null || payMax !== null
              ? {
                  payMin,
                  payMax,
                  payPeriod: period,
                  payType: period === 'PER_SERVICE' ? 'PER_SERVICE' : 'FIXED',
                }
              : {}),
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  actions: { gap: spacing.xs },
});
