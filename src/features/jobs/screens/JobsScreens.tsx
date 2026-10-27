import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useStyles } from '@/features/gallery';
import type { Location } from '@/shared/api';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate } from '@/shared/lib';
import { sizes, spacing } from '@/shared/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  DistrictPicker,
  FilterButton,
  FilterGroup,
  FilterSheet,
  InfiniteList,
  InfoCard,
  ListRow,
  Monogram,
  Notice,
  QueryView,
  Screen,
  StatusPill,
  Text,
  TextField,
  useFieldErrorText,
  type TextFieldProps,
} from '@/shared/ui';
import type { EmploymentType, JobApplication } from '../api/jobsApi';
import { ApplicationProgress, ApplicationStatusPill, JobCard, JobFact } from '../components/JobParts';
import {
  EMPLOYMENT_TYPES,
  useApplicants,
  useInviteBarber,
  useJob,
  useJobForm,
  useJobList,
  useMyApplications,
  useShopJobs,
  useNearMe,
} from '../hooks/useJobs';

const zone = env.defaultTimeZone;

/** "Empleos": open postings, filtered by kind, specialty and area. */
export function JobsScreen({
  onOpen,
  onApplications,
}: {
  onOpen: (id: string) => void;
  onApplications?: () => void;
}) {
  const { t } = useTranslation('jobs');
  const styleList = useStyles();
  const [type, setType] = useState<EmploymentType | undefined>(undefined);
  const [style, setStyle] = useState<string | undefined>(undefined);
  const [place, setPlace] = useState<Location | null>(null);
  const nearMe = useNearMe();
  const [filtering, setFiltering] = useState(false);
  const list = useJobList({
    employmentType: type,
    style,
    ubigeo: place?.ubigeo,
    near: nearMe.near ?? undefined,
  });
  return (
    <Screen scroll={false}>
      <FilterSheet
        visible={filtering}
        onClose={() => setFiltering(false)}
        onClear={() => {
          setType(undefined);
          setStyle(undefined);
        }}
      >
        <FilterGroup title={t('filterType')}>
          <Chip label={t('allTypes')} selected={!type} onPress={() => setType(undefined)} />
          {EMPLOYMENT_TYPES.map((k) => (
            <Chip key={k} label={t(`types.${k}`)} selected={type === k} onPress={() => setType(k)} />
          ))}
        </FilterGroup>
        <FilterGroup title={t('filterStyle')}>
          <Chip label={t('allStyles')} selected={!style} onPress={() => setStyle(undefined)} />
          {(styleList.data ?? []).map((st) => (
            <Chip key={st.id} label={st.name} selected={style === st.key} onPress={() => setStyle(st.key)} />
          ))}
        </FilterGroup>
      </FilterSheet>
      <InfiniteList
        query={list}
        keyExtractor={(j) => j.id}
        empty={{ title: t('empty'), message: t('emptyMessage'), icon: 'briefcase-outline' }}
        header={
          <View style={styles.section}>
            <Text color="textSecondary">{t('intro')}</Text>
            {onApplications ? (
              <ListRow icon="document-text" title={t('myApplications')} onPress={onApplications} />
            ) : null}
            <View style={styles.searchRow}>
              <View style={styles.flex}>
                <DistrictPicker label={t('area')} value={place} onChange={setPlace} allowAll />
              </View>
              <FilterButton
                active={Number(Boolean(type)) + Number(Boolean(style))}
                onPress={() => setFiltering(true)}
              />
            </View>
            <View style={styles.chipRow}>
              <Chip
                label={nearMe.near ? t('near.active') : t('near.label')}
                selected={nearMe.near !== null}
                onPress={nearMe.busy ? () => undefined : nearMe.toggle}
              />
            </View>
            {type || style ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {type ? (
                  <Chip label={`${t(`types.${type}`)} ✕`} selected onPress={() => setType(undefined)} />
                ) : null}
                {style ? (
                  <Chip
                    label={`${styleList.data?.find((st) => st.key === style)?.name ?? style} ✕`}
                    selected
                    onPress={() => setStyle(undefined)}
                  />
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <JobCard job={item} onPress={() => onOpen(item.id)} />}
      />
    </Screen>
  );
}

/** A posting, and "Postular" (or the state of the application when there is one). */
export function JobScreen({
  id,
  authenticated,
  onRequireLogin,
  onRequireProfile,
  onOpenShop,
}: {
  id: string;
  authenticated: boolean;
  onRequireLogin: () => void;
  onRequireProfile: () => void;
  onOpenShop: (barbershopId: string) => void;
}) {
  const { t } = useTranslation('jobs');
  const job = useJob(id, { onRequireProfile });
  return (
    <Screen>
      <QueryView query={job.query}>
        {(posting) => (
          <View style={styles.content}>
            <Card>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('openShop', { name: posting.barbershop.name })}
                onPress={() => onOpenShop(posting.barbershop.id)}
                style={styles.shop}
              >
                <Monogram
                  name={posting.barbershop.name}
                  size={sizes.avatarLarge}
                  imageUrl={posting.barbershop.logoUrl}
                />
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{posting.barbershop.name}</Text>
                  {posting.barbershop.ratingAverage !== null ? (
                    <Text color="textSecondary">
                      {t('shopRating', { average: posting.barbershop.ratingAverage.toFixed(1) })}
                    </Text>
                  ) : null}
                  <Text variant="caption" color="primary">
                    {t('seeShop')}
                  </Text>
                </View>
              </Pressable>
              <Text variant="title">{posting.title}</Text>
              <View style={styles.chips}>
                <Badge label={t(`types.${posting.employmentType}`)} tone="primary" />
                {posting.status === 'CLOSED' ? <Badge label={t('shop.status.CLOSED')} /> : null}
              </View>
              {posting.compensationText ? (
                <JobFact icon="cash" text={posting.compensationText} strong />
              ) : null}
              <JobFact icon="location" text={posting.barbershop.address} />
              {posting.closesAt ? (
                <JobFact
                  icon="time"
                  text={t('closesAt', { date: formatShortDate(posting.closesAt, zone) })}
                />
              ) : null}
              <JobFact icon="people" text={t('shop.applicants', { count: posting.applicationsCount })} />
            </Card>
            {posting.styles.length > 0 ? (
              <View style={styles.section}>
                <Text variant="subtitle">{t('wanted')}</Text>
                <View style={styles.chips}>
                  {posting.styles.map((st) => (
                    <Badge key={st.id} label={st.name} />
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.section}>
              <Text variant="subtitle">{t('about')}</Text>
              <Text>{posting.description}</Text>
            </View>
            {posting.myApplicationStatus ? (
              <Card>
                <Text variant="subtitle">{t('yourApplication')}</Text>
                <ApplicationProgress status={posting.myApplicationStatus} />
              </Card>
            ) : posting.status === 'CLOSED' ? (
              <Notice tone="info" message={t('closed')} />
            ) : (
              <Card>
                <Text variant="subtitle">{t('applyTitle')}</Text>
                <TextField
                  label={t('message')}
                  hint={t('messageHint')}
                  value={job.message}
                  onChangeText={job.setMessage}
                  multiline
                  maxLength={1000}
                />
                {job.error ? <Notice tone="danger" message={job.error} /> : null}
                <Button
                  label={t('apply')}
                  icon="paper-plane"
                  onPress={authenticated ? job.apply : onRequireLogin}
                  loading={job.isApplying}
                  fullWidth
                />
              </Card>
            )}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

/** "Mis postulaciones": state of each, and "Retirar" while it is sent or shortlisted. */
export function MyApplicationsScreen({ onOpenJob }: { onOpenJob: (postingId: string) => void }) {
  const { t } = useTranslation('jobs');
  const mine = useMyApplications();
  const [withdrawing, setWithdrawing] = useState<JobApplication | null>(null);
  return (
    <Screen>
      {mine.error ? <Notice tone="danger" message={mine.error} /> : null}
      <QueryView
        query={mine.query}
        isEmpty={(items) => items.length === 0}
        empty={{
          title: t('noApplications'),
          message: t('noApplicationsMessage'),
          icon: 'document-text-outline',
        }}
      >
        {(items) => (
          <View style={styles.content}>
            {items.map((a) => (
              <Card key={a.id}>
                <InfoCard
                  onPress={() => onOpenJob(a.postingId)}
                  title={a.postingTitle}
                  subtitle={a.barbershopName}
                  details={[
                    { icon: 'calendar', text: t('sentOn', { date: formatShortDate(a.createdAt, zone) }) },
                  ]}
                />
                <ApplicationProgress status={a.status} />
                {a.status === 'HIRED' ? <Notice tone="success" message={t('hiredInfo')} /> : null}
                {a.status === 'APPLIED' || a.status === 'SHORTLISTED' ? (
                  <Button label={t('withdraw')} variant="ghost" onPress={() => setWithdrawing(a)} />
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </QueryView>
      <ConfirmDialog
        visible={withdrawing !== null}
        title={t('withdrawTitle')}
        message={t('withdrawMessage')}
        confirmLabel={t('withdraw')}
        destructive
        loading={mine.isWithdrawing}
        onConfirm={() => {
          if (withdrawing) mine.withdraw(withdrawing.id);
          setWithdrawing(null);
        }}
        onCancel={() => setWithdrawing(null)}
      />
    </Screen>
  );
}

/** "Ofertas de trabajo" of the barbershop. */
export function ShopJobsScreen({
  shopId,
  onNew,
  onOpen,
}: {
  shopId: string;
  onNew: () => void;
  onOpen: (jobId: string) => void;
}) {
  const { t } = useTranslation('jobs');
  const query = useShopJobs(shopId);
  return (
    <Screen>
      <Button label={t('shop.new')} icon="add-circle" onPress={onNew} />
      <QueryView
        query={query}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('shop.empty'), message: t('shop.emptyMessage'), icon: 'briefcase-outline' }}
      >
        {(items) => (
          <View style={styles.content}>
            {items.map((job) => (
              <InfoCard
                key={job.id}
                testID={`shop-job-${job.id}`}
                onPress={() => onOpen(job.id)}
                title={job.title}
                subtitle={t(`types.${job.employmentType}`)}
                details={[{ icon: 'people', text: t('shop.applicants', { count: job.applicationsCount }) }]}
                trailing={
                  <StatusPill
                    tone={job.status === 'OPEN' ? 'success' : 'neutral'}
                    icon={job.status === 'OPEN' ? 'checkmark-circle' : 'lock-closed'}
                    label={t(`shop.status.${job.status}`)}
                  />
                }
              />
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

function FormField<T extends FieldValues>({
  control,
  name,
  ...props
}: { control: Control<T>; name: Path<T> } & Omit<TextFieldProps, 'value' | 'onChangeText'>) {
  const errorText = useFieldErrorText('jobs');
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          value={field.value as string}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
          error={errorText(fieldState.error?.message)}
        />
      )}
    />
  );
}

/** Create or edit a posting; when editing, also close or reopen it and see its applicants. */
export function JobFormScreen({
  shopId,
  jobId,
  onSaved,
  onApplicants,
}: {
  shopId: string;
  jobId?: string;
  onSaved: (jobId: string) => void;
  onApplicants?: () => void;
}) {
  const { t } = useTranslation('jobs');
  const styleList = useStyles();
  const f = useJobForm({ shopId, jobId, onSaved: (job) => onSaved(job.id) });
  const body = (
    <View style={styles.content}>
      {f.job && onApplicants ? (
        <Button
          label={t('shop.seeApplicants', { count: f.job.applicationsCount })}
          icon="people"
          onPress={onApplicants}
        />
      ) : null}
      {f.job ? (
        <Button
          label={f.job.status === 'OPEN' ? t('shop.close') : t('shop.reopen')}
          variant="secondary"
          onPress={() => f.setStatus(f.job!.status === 'OPEN' ? 'CLOSED' : 'OPEN')}
          loading={f.isToggling}
        />
      ) : null}
      {f.generalError ? <Notice tone="danger" message={f.generalError} /> : null}
      <FormField control={f.form.control} name="title" label={t('form.title')} maxLength={80} />
      <FormField
        control={f.form.control}
        name="description"
        label={t('form.description')}
        multiline
        maxLength={2000}
      />
      <Controller
        control={f.form.control}
        name="employmentType"
        render={({ field }) => (
          <View style={styles.section}>
            <Text variant="label" color="textSecondary">
              {t('form.type')}
            </Text>
            <View style={styles.chips}>
              {EMPLOYMENT_TYPES.map((k) => (
                <Chip
                  key={k}
                  label={t(`types.${k}`)}
                  selected={field.value === k}
                  onPress={() => field.onChange(k)}
                />
              ))}
            </View>
          </View>
        )}
      />
      <FormField
        control={f.form.control}
        name="compensationText"
        label={t('form.compensation')}
        hint={t('form.compensationHint')}
        maxLength={120}
      />
      <Controller
        control={f.form.control}
        name="styleIds"
        render={({ field }) => (
          <View style={styles.section}>
            <Text variant="label" color="textSecondary">
              {t('form.styles')}
            </Text>
            <View style={styles.chips}>
              {(styleList.data ?? []).map((s) => {
                const selected = field.value.includes(s.id);
                return (
                  <Chip
                    key={s.id}
                    label={s.name}
                    selected={selected}
                    onPress={() =>
                      field.onChange(
                        selected
                          ? field.value.filter((id: string) => id !== s.id)
                          : field.value.length < 10
                            ? [...field.value, s.id]
                            : field.value,
                      )
                    }
                  />
                );
              })}
            </View>
          </View>
        )}
      />
      <FormField
        control={f.form.control}
        name="closesAt"
        label={t('form.closesAt')}
        hint={t('form.closesAtHint')}
        placeholder={t('form.datePlaceholder')}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      <Button
        label={f.editing ? t('form.save') : t('form.publish')}
        onPress={() => void f.submit()}
        loading={f.isSubmitting}
        fullWidth
      />
    </View>
  );
  return (
    <Screen>
      {jobId ? (
        <QueryView query={f.list} isEmpty={() => !f.job} empty={{ title: t('shop.notFound') }}>
          {() => body}
        </QueryView>
      ) : (
        body
      )}
    </Screen>
  );
}

/** Applicants: open their profile, shortlist, reject or hire. */
export function ApplicantsScreen({
  shopId,
  jobId,
  onOpenProfile,
  onHired,
}: {
  shopId: string;
  jobId: string;
  onOpenProfile: (profileId: string) => void;
  /** "Ya está en tu equipo. Asígnale servicios y horario": to the barbers screen. */
  onHired: () => void;
}) {
  const { t } = useTranslation('jobs');
  const a = useApplicants(shopId, jobId, { onHired });
  const [hiring, setHiring] = useState<JobApplication | null>(null);
  return (
    <Screen>
      {a.error ? <Notice tone="danger" message={a.error} /> : null}
      <QueryView
        query={a.query}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('shop.noApplicants'), icon: 'people-outline' }}
      >
        {(items) => (
          <View style={styles.content}>
            {items.map((app) => {
              const busy = a.deciding?.id === app.id;
              const open = app.status === 'APPLIED' || app.status === 'SHORTLISTED';
              return (
                <Card key={app.id}>
                  <InfoCard
                    onPress={() => onOpenProfile(app.applicant.barberProfileId)}
                    leading={<Monogram name={app.applicant.displayName} imageUrl={app.applicant.photoUrl} />}
                    title={app.applicant.displayName}
                    subtitle={
                      app.applicant.yearsExperience !== null
                        ? t('shop.years', { count: app.applicant.yearsExperience })
                        : undefined
                    }
                    details={
                      app.applicant.ratingAverage !== null
                        ? [
                            {
                              icon: 'star',
                              text: t('shop.rating', {
                                average: app.applicant.ratingAverage.toFixed(1),
                                count: app.applicant.ratingCount,
                              }),
                            },
                          ]
                        : []
                    }
                    trailing={<ApplicationStatusPill status={app.status} />}
                  />
                  {app.message ? <Text color="textSecondary">{app.message}</Text> : null}
                  {open ? (
                    <View style={styles.row}>
                      {app.status === 'APPLIED' ? (
                        <Button
                          label={t('shop.shortlist')}
                          variant="secondary"
                          onPress={() => a.decide(app.id, 'SHORTLISTED')}
                          disabled={busy}
                        />
                      ) : null}
                      <Button label={t('shop.hire')} onPress={() => setHiring(app)} disabled={busy} />
                      <Button
                        label={t('shop.reject')}
                        variant="ghost"
                        onPress={() => a.decide(app.id, 'REJECTED')}
                        disabled={busy}
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </QueryView>
      <ConfirmDialog
        visible={hiring !== null}
        title={t('shop.hireTitle', { name: hiring?.applicant.displayName ?? '' })}
        message={t('shop.hireMessage')}
        confirmLabel={t('shop.hire')}
        onConfirm={() => {
          if (hiring) a.decide(hiring.id, 'HIRED');
          setHiring(null);
        }}
        onCancel={() => setHiring(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  chipRow: { gap: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  shop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

/** "Invitar a mi barbería" for one barber profile (once per screen visit). */
export function InviteBarberButton({ shopId, profileId }: { shopId: string; profileId: string }) {
  const { t } = useTranslation('jobs');
  const invite = useInviteBarber(shopId);
  return (
    <View style={styles.section}>
      {invite.error ? <Notice tone="danger" message={invite.error} /> : null}
      <Button
        label={invite.wasInvited(profileId) ? t('invite.invited') : t('invite.action')}
        icon="person-add"
        onPress={() => invite.invite(profileId)}
        loading={invite.isInviting(profileId)}
        disabled={invite.wasInvited(profileId)}
      />
    </View>
  );
}

/** What owners and managers can do on a barber's profile: write to them and invite them. */
export function StaffBarberActions({
  shopId,
  profileId,
  onWrite,
}: {
  shopId: string;
  profileId: string;
  onWrite: () => void;
}) {
  const { t } = useTranslation('jobs');
  return (
    <View style={styles.section}>
      <Button label={t('invite.write')} icon="chatbubble-ellipses" variant="secondary" onPress={onWrite} />
      <InviteBarberButton shopId={shopId} profileId={profileId} />
    </View>
  );
}
