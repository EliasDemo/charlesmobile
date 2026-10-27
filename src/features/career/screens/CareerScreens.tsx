import { useState, type ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Image, StyleSheet, View } from 'react-native';
import { useStyles } from '@/features/gallery';
import type { Location } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate } from '@/shared/lib';
import { env } from '@/shared/config';
import { sizes, spacing } from '@/shared/theme';
import {
  ConfirmButton,
  Button,
  Card,
  Checkbox,
  DistrictPicker,
  Chip,
  ConfirmDialog,
  EmptyState,
  FilterButton,
  FilterGroup,
  FilterSheet,
  InfiniteList,
  InfoCard,
  ListRow,
  Monogram,
  Celebration,
  Notice,
  QueryView,
  Screen,
  SearchField,
  SegmentedControl,
  Stars,
  SwitchRow,
  Text,
  TextField,
  useFieldErrorText,
  type TextFieldProps,
  useNearMe,
  ReviewLikeButton,
} from '@/shared/ui';
import type { PortfolioItem, RankedBarber, RankingFilters, Workplace } from '../api/careerApi';
import { CareerHeader, PortfolioGrid, RankText } from '../components/CareerParts';
import { CareerProgressCard } from '../components/CareerProgress';
import { careerSteps, useRankCelebration } from '../hooks/useCareerProgress';
import {
  CAPTION_MAX,
  PORTFOLIO_STYLES_MAX,
  SPECIALTIES_MAX,
  useCareerPhoto,
  useCareerProfileForm,
  useDeletePortfolioItem,
  useLeaveWorkplace,
  useMyCareerProfile,
  usePortfolio,
  usePortfolioUpload,
  useProfileReviews,
  usePublicCareerProfile,
  useRanking,
  useSpecialtiesEditor,
} from '../hooks/useCareer';

function FormField<T extends FieldValues>({
  control,
  name,
  ...props
}: { control: Control<T>; name: Path<T> } & Omit<TextFieldProps, 'value' | 'onChangeText'>) {
  const errorText = useFieldErrorText('career');
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

export interface MyCareerProfileScreenProps {
  onEdit: () => void;
  onSpecialties: () => void;
  onAddCut: () => void;
  onOpenPublic: (profileId: string) => void;
  onOpenShop: (barbershopId: string) => void;
  onJobs: () => void;
  onApplications: () => void;
  /** "Mis videos" (from the videos feature). */
  videos?: (profileId: string) => ReactNode;
  /** Has applied to a job at least once (from the jobs feature); undefined hides that step. */
  hasApplied?: boolean;
}

/** "Mi perfil profesional": what follows the barber across barbershops. */
export function MyCareerProfileScreen(props: MyCareerProfileScreenProps) {
  const { t } = useTranslation('career');
  const mine = useMyCareerProfile();
  const photo = useCareerPhoto();
  const portfolio = usePortfolio(mine.data?.id ?? '');
  const remove = useDeletePortfolioItem();
  const leave = useLeaveWorkplace();
  const celebrating = useRankCelebration(mine.data?.rank);
  const [removing, setRemoving] = useState<PortfolioItem | null>(null);
  const [leaving, setLeaving] = useState<Workplace | null>(null);

  return (
    <Screen>
      <Celebration visible={celebrating} />
      <QueryView
        query={mine}
        isEmpty={(profile) => profile === null}
        empty={{
          title: t('create.title'),
          message: t('create.message'),
          icon: 'cut-outline',
          action: { label: t('create.action'), onPress: props.onEdit },
        }}
      >
        {(profile) => {
          const current = profile!.workplaces.filter((w) => w.current);
          const past = profile!.workplaces.filter((w) => !w.current);
          return (
            <View style={styles.content}>
              <CareerHeader profile={profile!} own />
              {celebrating ? (
                <Notice tone="success" message={t('progress.entered', { rank: profile!.rank })} />
              ) : null}
              <CareerProgressCard
                profile={profile!}
                steps={careerSteps(profile!, portfolio.items?.length ?? 0, props.hasApplied).map((step) => ({
                  ...step,
                  onPress: {
                    photo: photo.available ? photo.choose : props.onEdit,
                    specialties: props.onSpecialties,
                    portfolio: props.onAddCut,
                    available: props.onEdit,
                    applied: props.onJobs,
                  }[step.key],
                }))}
              />
              {photo.message ? <Notice tone="warning" message={photo.message} /> : null}
              {photo.available ? (
                <View style={styles.row}>
                  <Button
                    label={t('photo.change')}
                    icon="images"
                    variant="secondary"
                    onPress={photo.choose}
                    loading={photo.busy}
                  />
                  {profile!.photoUrl ? (
                    <ConfirmButton
                      label={t('photo.remove')}
                      variant="ghost"
                      onConfirm={photo.remove}
                      disabled={photo.busy}
                      confirm={{
                        title: t('confirm.removePhotoTitle', { ns: 'common' }),
                        message: t('confirm.removePhotoMessage', { ns: 'common' }),
                        confirmLabel: t('confirm.removePhoto', { ns: 'common' }),
                        destructive: true,
                      }}
                    />
                  ) : null}
                </View>
              ) : null}
              <View>
                <ListRow icon="create" title={t('edit')} onPress={props.onEdit} />
                <ListRow
                  icon="sparkles"
                  title={t('specialties.title')}
                  value={t('specialties.count', { count: profile!.specialties.length, max: SPECIALTIES_MAX })}
                  onPress={props.onSpecialties}
                />
                <ListRow icon="eye" title={t('seePublic')} onPress={() => props.onOpenPublic(profile!.id)} />
                <ListRow icon="briefcase" title={t('jobs')} onPress={props.onJobs} />
                <ListRow icon="document-text" title={t('applications')} onPress={props.onApplications} />
              </View>

              <View style={styles.section}>
                <Text variant="subtitle">{t('portfolio.title')}</Text>
                <Button label={t('portfolio.add')} icon="add-circle" onPress={props.onAddCut} />
                {portfolio.items && portfolio.items.length > 0 ? (
                  <>
                    <PortfolioGrid items={portfolio.items} onLongPress={setRemoving} />
                    <Text variant="caption" color="textSecondary">
                      {t('portfolio.removeHint')}
                    </Text>
                  </>
                ) : (
                  <Text color="textSecondary">{t('portfolio.empty')}</Text>
                )}
              </View>

              {props.videos?.(profile!.id)}

              <View style={styles.section}>
                <Text variant="subtitle">{t('workplaces.title')}</Text>
                <Text variant="caption" color="textSecondary">
                  {t('workplaces.keep')}
                </Text>
                {leave.error ? <Notice tone="danger" message={leave.error} /> : null}
                {current.length === 0 ? <Text color="textSecondary">{t('workplaces.none')}</Text> : null}
                {current.map((w) => (
                  <Card key={w.barberId}>
                    <ListRow
                      icon="storefront"
                      title={w.barbershopName}
                      onPress={() => props.onOpenShop(w.barbershopId)}
                    />
                    <Text variant="caption" color="textSecondary">
                      {t('workplaces.since', { date: formatShortDate(w.since, env.defaultTimeZone) })}
                    </Text>
                    {w.barbershopType === 'SHOP' ? (
                      <Button label={t('workplaces.leave')} variant="ghost" onPress={() => setLeaving(w)} />
                    ) : null}
                  </Card>
                ))}
                {past.length > 0 ? (
                  <Text variant="label" color="textSecondary">
                    {t('workplaces.past')}
                  </Text>
                ) : null}
                {past.map((w) => (
                  <Text key={w.barberId} color="textSecondary">
                    {t('workplaces.pastLine', {
                      name: w.barbershopName,
                      until: w.until ? formatShortDate(w.until, env.defaultTimeZone) : '',
                    })}
                  </Text>
                ))}
              </View>
            </View>
          );
        }}
      </QueryView>
      <ConfirmDialog
        visible={removing !== null}
        title={t('portfolio.removeTitle')}
        message={t('portfolio.removeMessage')}
        confirmLabel={t('portfolio.remove')}
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        visible={leaving !== null}
        title={t('workplaces.leaveTitle', { name: leaving?.barbershopName ?? '' })}
        message={t('workplaces.leaveMessage')}
        confirmLabel={t('workplaces.leave')}
        destructive
        loading={leave.isLeaving}
        onConfirm={() => {
          if (leaving) leave.leave(leaving.barberId);
          setLeaving(null);
        }}
        onCancel={() => setLeaving(null)}
      />
    </Screen>
  );
}

/** Create or edit the professional profile. */
export function CareerProfileFormScreen({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation('career');
  const f = useCareerProfileForm({ onSaved });
  return (
    <Screen>
      <QueryView query={f.mine}>
        {() => (
          <View style={styles.content}>
            {f.creating ? <Notice tone="info" message={t('form.createInfo')} /> : null}
            {f.generalError ? <Notice tone="danger" message={f.generalError} /> : null}
            <FormField
              control={f.form.control}
              name="displayName"
              label={t('form.displayName')}
              maxLength={60}
            />
            <FormField
              control={f.form.control}
              name="headline"
              label={t('form.headline')}
              hint={t('form.headlineHint')}
              maxLength={80}
            />
            <FormField control={f.form.control} name="bio" label={t('form.bio')} multiline maxLength={600} />
            <FormField
              control={f.form.control}
              name="yearsExperience"
              label={t('form.years')}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Controller
              control={f.form.control}
              name="location"
              render={({ field }) => (
                <DistrictPicker label={t('form.district')} value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={f.form.control}
              name="availableForWork"
              render={({ field }) => (
                <SwitchRow
                  title={t('form.available')}
                  subtitle={t('form.availableHint')}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <Button
              label={f.creating ? t('form.create') : t('form.save')}
              onPress={() => void f.submit()}
              loading={f.isSubmitting}
              fullWidth
            />
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

export function CareerSpecialtiesScreen({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation('career');
  const styles_ = useStyles();
  const editor = useSpecialtiesEditor({ onSaved });
  return (
    <Screen>
      <Text color="textSecondary">{t('specialties.hint', { max: SPECIALTIES_MAX })}</Text>
      {editor.error ? <Notice tone="danger" message={editor.error} /> : null}
      <QueryView query={styles_}>
        {(list) => (
          <View style={styles.chips}>
            {list.map((style) => (
              <Chip
                key={style.id}
                label={style.name}
                selected={editor.selected.includes(style.id)}
                onPress={() => editor.toggle(style.id)}
              />
            ))}
          </View>
        )}
      </QueryView>
      <Button label={t('form.save')} onPress={editor.save} loading={editor.isSaving} fullWidth />
    </Screen>
  );
}

/** "Agregar corte": photo, caption, styles and the required consent of the person photographed. */
export function AddCutScreen({ onUploaded }: { onUploaded: () => void }) {
  const { t } = useTranslation('career');
  const styleList = useStyles();
  const u = usePortfolioUpload({ onUploaded });
  return (
    <Screen>
      {!u.available ? <Notice tone="info" message={t('portfolio.unavailable')} /> : null}
      {u.message ? <Notice tone="warning" message={u.message} /> : null}
      {u.photo ? (
        <Image source={{ uri: u.photo.uri }} style={styles.preview} accessibilityIgnoresInvertColors />
      ) : null}
      {u.available ? (
        <View style={styles.row}>
          <Button label={t('portfolio.choose')} icon="images" onPress={() => void u.pick('library')} />
          <Button
            label={t('portfolio.take')}
            variant="secondary"
            icon="camera"
            onPress={() => void u.pick('camera')}
          />
        </View>
      ) : null}
      <TextField
        label={t('portfolio.caption')}
        value={u.caption}
        onChangeText={u.setCaption}
        maxLength={CAPTION_MAX}
      />
      <Text variant="label" color="textSecondary">
        {t('portfolio.styles', { max: PORTFOLIO_STYLES_MAX })}
      </Text>
      <QueryView query={styleList}>
        {(list) => (
          <View style={styles.chips}>
            {list.map((style) => (
              <Chip
                key={style.id}
                label={style.name}
                selected={u.styleIds.includes(style.id)}
                onPress={() => u.toggleStyle(style.id)}
              />
            ))}
          </View>
        )}
      </QueryView>
      <Checkbox label={t('portfolio.consent')} checked={u.consent} onChange={u.setConsent} />
      <Button
        label={t('portfolio.upload')}
        onPress={u.upload}
        loading={u.isUploading}
        disabled={!u.canUpload}
        fullWidth
      />
    </Screen>
  );
}

type PublicTab = 'cuts' | 'reviews' | 'videos';

/** A barber's public profile: their career, where they work today, cuts, reviews and videos. */
export function PublicCareerProfileScreen({
  id,
  onOpenShop,
  actions,
  videos,
}: {
  id: string;
  onOpenShop: (barbershopId: string) => void;
  /** "Escribir" and "Invitar a mi barbería" for owners and managers. */
  actions?: ReactNode;
  videos?: ReactNode;
}) {
  const { t } = useTranslation('career');
  const profile = usePublicCareerProfile(id);
  const [tab, setTab] = useState<PublicTab>('cuts');
  const [style, setStyle] = useState<string | undefined>(undefined);
  const styleList = useStyles();
  const portfolio = usePortfolio(id, style);
  const reviews = useProfileReviews(id);
  return (
    <Screen>
      <QueryView
        query={profile}
        notFound={{ title: t('notFound'), action: { label: t('back'), onPress: () => onOpenShop('') } }}
      >
        {(p) => (
          <View style={styles.content}>
            <CareerHeader profile={p} />
            {actions}
            {p.workplaces.length > 0 ? (
              <View>
                <Text variant="label" color="textSecondary">
                  {t('worksAt')}
                </Text>
                {p.workplaces.map((w) => (
                  <ListRow
                    key={w.barberId}
                    icon="storefront"
                    title={w.barbershopName}
                    onPress={() => onOpenShop(w.barbershopId)}
                  />
                ))}
              </View>
            ) : null}
            <SegmentedControl
              label={t('tabs.label')}
              hideLabel
              options={[
                { value: 'cuts', label: t('tabs.cuts') },
                { value: 'reviews', label: t('tabs.reviews') },
                { value: 'videos', label: t('tabs.videos') },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'cuts' ? (
              <View style={styles.section}>
                <View style={styles.chips}>
                  <Chip label={t('allStyles')} selected={!style} onPress={() => setStyle(undefined)} />
                  {(styleList.data ?? [])
                    .filter((s) => p.specialties.some((sp) => sp.id === s.id))
                    .map((s) => (
                      <Chip
                        key={s.id}
                        label={s.name}
                        selected={style === s.key}
                        onPress={() => setStyle(s.key)}
                      />
                    ))}
                </View>
                {portfolio.items === undefined ? null : portfolio.items.length === 0 ? (
                  <EmptyState title={t('portfolio.emptyPublic')} icon="images-outline" />
                ) : (
                  <PortfolioGrid items={portfolio.items} />
                )}
                {portfolio.hasNextPage ? (
                  <Button
                    label={t('more')}
                    variant="ghost"
                    onPress={() => void portfolio.fetchNextPage()}
                    loading={portfolio.isFetchingNextPage}
                  />
                ) : null}
              </View>
            ) : null}
            {tab === 'reviews' ? (
              <View style={styles.section}>
                {reviews.items === undefined ? null : reviews.items.length === 0 ? (
                  <EmptyState title={t('noReviews')} icon="star-outline" />
                ) : (
                  reviews.items.map((r) => (
                    <Card key={r.id}>
                      <View style={styles.row}>
                        <Monogram name={r.clientName} size={sizes.avatarSmall} imageUrl={r.authorPhotoUrl} />
                        <View style={styles.flex}>
                          <Text variant="bodyStrong">{`@${r.clientName}`}</Text>
                          <Stars rating={r.rating} />
                        </View>
                      </View>
                      {r.comment ? <Text>{r.comment}</Text> : null}
                      <Text variant="caption" color="textSecondary">
                        {[r.serviceName, r.barbershopName].filter(Boolean).join(' · ')}
                      </Text>
                      <ReviewLikeButton reviewId={r.id} likes={r.likes} likedByMe={r.likedByMe} />
                    </Card>
                  ))
                )}
                {reviews.hasNextPage ? (
                  <Button
                    label={t('more')}
                    variant="ghost"
                    onPress={() => void reviews.fetchNextPage()}
                    loading={reviews.isFetchingNextPage}
                  />
                ) : null}
              </View>
            ) : null}
            {tab === 'videos'
              ? (videos ?? <EmptyState title={t('noVideos')} icon="videocam-outline" />)
              : null}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

/**
 * "Barberos": the ranking. With `availableOnly`, barbershops looking for staff (and an action per
 * barber, e.g. "Invitar"). Barbers with `rank: null` come last, marked as new.
 */
export function RankingScreen({
  availableOnly = false,
  onOpen,
  renderAction,
}: {
  availableOnly?: boolean;
  onOpen: (profileId: string) => void;
  renderAction?: (barber: RankedBarber) => ReactNode;
}) {
  const { t } = useTranslation('career');
  const styleList = useStyles();
  const [q, setQ] = useState('');
  const [place, setPlace] = useState<Location | null>(null);
  const [style, setStyle] = useState<string | undefined>(undefined);
  const nearMe = useNearMe();
  const filters: RankingFilters = {
    q,
    near: nearMe.near ?? undefined,
    district: place?.district,
    style,
    availableForWork: availableOnly || undefined,
  };
  const ranking = useRanking(filters);
  const [filtering, setFiltering] = useState(false);
  return (
    <Screen scroll={false}>
      <FilterSheet
        visible={filtering}
        onClose={() => setFiltering(false)}
        onClear={() => {
          setStyle(undefined);
          setPlace(null);
        }}
      >
        <DistrictPicker label={t('ranking.district')} value={place} onChange={setPlace} allowAll />
        <FilterGroup title={t('specialties.title')}>
          <Chip label={t('allStyles')} selected={!style} onPress={() => setStyle(undefined)} />
          {(styleList.data ?? []).map((s) => (
            <Chip key={s.id} label={s.name} selected={style === s.key} onPress={() => setStyle(s.key)} />
          ))}
        </FilterGroup>
      </FilterSheet>
      <InfiniteList
        query={ranking}
        keyExtractor={(b) => b.id}
        empty={{ title: t('ranking.empty'), icon: 'people-outline' }}
        header={
          <View style={styles.section}>
            {availableOnly ? <Notice tone="info" message={t('ranking.availableInfo')} /> : null}
            <View style={styles.searchRow}>
              <View style={styles.flex}>
                <SearchField
                  label={t('ranking.search')}
                  value={q}
                  onChangeText={setQ}
                  placeholder={t('ranking.search')}
                />
              </View>
              <FilterButton
                active={Number(Boolean(style)) + Number(Boolean(place))}
                onPress={() => setFiltering(true)}
              />
            </View>
            <View style={styles.row}>
              <Chip
                label={
                  nearMe.near ? t('nearMe.active', { ns: 'common' }) : t('nearMe.label', { ns: 'common' })
                }
                selected={nearMe.near !== null}
                onPress={nearMe.toggle}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.rankItem}>
            <InfoCard
              testID={`ranked-${item.id}`}
              onPress={() => onOpen(item.id)}
              leading={<Monogram name={item.displayName} imageUrl={item.photoUrl} />}
              title={
                item.rank ? t('ranking.line', { rank: item.rank, name: item.displayName }) : item.displayName
              }
              subtitle={item.headline ?? item.currentBarbershops.join(' · ')}
              details={[
                ...(item.ratingAverage !== null
                  ? [
                      {
                        icon: 'star' as const,
                        text: t('ranking.rating', {
                          average: item.ratingAverage.toFixed(1),
                          count: item.ratingCount,
                        }),
                      },
                    ]
                  : []),
                { icon: 'cut' as const, text: t('attended', { count: item.attendedCount }) },
                ...(item.distanceKm != null
                  ? [
                      {
                        icon: 'navigate' as const,
                        text: t('ranking.distance', { km: item.distanceKm.toFixed(1) }),
                      },
                    ]
                  : []),
                ...(item.district ? [{ icon: 'location' as const, text: item.district }] : []),
              ]}
              trailing={item.rank === null ? <RankText rank={null} /> : undefined}
              footer={
                item.specialties.length > 0 ? (
                  <Text variant="caption" color="textSecondary">
                    {item.specialties.map((s) => s.name).join(' · ')}
                  </Text>
                ) : undefined
              }
            />
            {renderAction?.(item)}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { width: '100%', aspectRatio: 1 },
  rankItem: { gap: spacing.xs },
  searchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  flex: { flex: 1 },
});
