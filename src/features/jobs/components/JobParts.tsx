import type { TFunction } from 'i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate } from '@/shared/lib';
import { sizes, spacing, useTheme, type StatusTone } from '@/shared/theme';
import {
  Badge,
  Icon,
  Monogram,
  StatusPill,
  Text,
  usePressScale,
  useSurfaceStyle,
  type IconName,
} from '@/shared/ui';
import type { ApplicationStatus, EmploymentType, JobPosting } from '../api/jobsApi';

const zone = env.defaultTimeZone;

const STATUS: Record<ApplicationStatus, { tone: StatusTone; icon: IconName }> = {
  APPLIED: { tone: 'pending', icon: 'paper-plane' },
  SHORTLISTED: { tone: 'pending', icon: 'star' },
  REJECTED: { tone: 'danger', icon: 'close-circle' },
  HIRED: { tone: 'success', icon: 'checkmark-circle' },
  WITHDRAWN: { tone: 'neutral', icon: 'return-down-back' },
};

export const TYPE_ICON: Record<EmploymentType, IconName> = {
  FULL_TIME: 'briefcase',
  PART_TIME: 'hourglass',
  WEEKENDS: 'calendar',
  COMMISSION: 'trending-up',
  FREELANCE: 'person',
};

export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation('jobs');
  return <StatusPill tone={STATUS[status].tone} icon={STATUS[status].icon} label={t(`status.${status}`)} />;
}

/** A small fact with its icon (kind of job, pay, closing date…). */
export function JobFact({ icon, text, strong }: { icon: IconName; text: string; strong?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.fact}>
      <Icon
        name={icon}
        size={theme.typography.label.fontSize}
        color={strong ? theme.colors.success : theme.colors.textMuted}
      />
      <Text variant={strong ? 'bodyStrong' : 'label'} color={strong ? 'success' : 'textSecondary'}>
        {text}
      </Text>
    </View>
  );
}

/** A job posting: who hires, what, the kind of job, the pay and until when. */
/** Pay comes in céntimos of soles (the job board is for Peru). */
const PAY_CURRENCY = 'PEN';

/** Where the posting is: its district when the API knows it, the address otherwise. */
const placeOf = (job: JobPosting) =>
  job.location ? `${job.location.district}, ${job.location.province}` : job.barbershop.address;

/**
 * "S/ 1,200 – 1,800 al mes · Comisión · Negociable", from the fields the backend gives. The app
 * shows them as they come (never computes pay).
 */
export function jobPayText(job: JobPosting, t: TFunction<'jobs'>): string | null {
  const money = (amount: number) => formatMoney({ amount, currency: PAY_CURRENCY });
  const range =
    job.payMin !== null && job.payMax !== null && job.payMin !== job.payMax
      ? `${money(job.payMin)} – ${money(job.payMax)}`
      : job.payMin !== null
        ? money(job.payMin)
        : job.payMax !== null
          ? t('pay.upTo', { amount: money(job.payMax) })
          : null;
  const parts = [
    range ? (job.payPeriod ? `${range} ${t(`pay.period.${job.payPeriod}`)}` : range) : null,
    job.payType ? t(`pay.type.${job.payType}`) : null,
    job.negotiable ? t('pay.negotiable') : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function JobCard({ job, onPress }: { job: JobPosting; onPress: () => void }) {
  const { t } = useTranslation('jobs');
  const surface = useSurfaceStyle();
  const press = usePressScale();
  const pay = jobPayText(job, t);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${job.barbershop.name}`}
      onPress={onPress}
      {...press.handlers}
      testID={`job-${job.id}`}
    >
      <Animated.View style={[styles.card, surface, press.style]}>
        <View style={styles.top}>
          <Monogram name={job.barbershop.name} size={sizes.avatar} imageUrl={job.barbershop.logoUrl} />
          <View style={styles.flex}>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {job.barbershop.name}
              {job.barbershop.ratingAverage !== null
                ? `  ${t('shopRating', { average: job.barbershop.ratingAverage.toFixed(1) })}`
                : ''}
            </Text>
            <Text variant="subtitle" numberOfLines={2}>
              {job.title}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <Badge label={t(`types.${job.employmentType}`)} tone="primary" />
          {job.myApplicationStatus ? <ApplicationStatusPill status={job.myApplicationStatus} /> : null}
        </View>
        {pay ? <JobFact icon="cash" text={pay} strong /> : null}
        {!pay && job.compensationText ? <JobFact icon="cash" text={job.compensationText} strong /> : null}
        <JobFact
          icon="location"
          text={
            job.distanceKm !== null
              ? t('card.distance', { km: job.distanceKm.toFixed(1), place: placeOf(job) })
              : placeOf(job)
          }
        />
        {job.schedule ? <JobFact icon="time" text={job.schedule} /> : null}
        {job.requirements.length > 0 ? (
          <JobFact icon="checkmark-circle" text={job.requirements.slice(0, 3).join(' · ')} />
        ) : null}
        {job.closesAt ? (
          <JobFact icon="time" text={t('closesAt', { date: formatShortDate(job.closesAt, zone) })} />
        ) : null}
        {job.styles.length > 0 ? (
          <View style={styles.row}>
            {job.styles.map((s) => (
              <Badge key={s.id} label={s.name} />
            ))}
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const STEPS: ApplicationStatus[] = ['APPLIED', 'SHORTLISTED', 'HIRED'];

/** Where an application is: Enviada → Preseleccionado → ¡Contratado! (or it ended). */
export function ApplicationProgress({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation('jobs');
  const theme = useTheme();
  if (status === 'REJECTED' || status === 'WITHDRAWN') return <ApplicationStatusPill status={status} />;
  const reached = STEPS.indexOf(status);
  return (
    <View style={styles.steps} accessible accessibilityLabel={t(`status.${status}`)}>
      {STEPS.map((step, index) => {
        const done = index <= reached;
        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: done ? theme.colors.primary : theme.colors.surface,
                  borderColor: done ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              {done ? <Icon name="checkmark" size={sizes.icon * 0.6} color={theme.colors.onPrimary} /> : null}
            </View>
            <Text variant="caption" color={done ? 'textPrimary' : 'textMuted'} align="center">
              {t(`status.${step}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  steps: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  step: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  dot: {
    width: sizes.icon,
    height: sizes.icon,
    borderRadius: sizes.icon / 2,
    borderWidth: sizes.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
