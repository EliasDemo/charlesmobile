import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { formatDistance } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Badge,
  BrandHero,
  Button,
  Checkbox,
  Icon,
  Monogram,
  Notice,
  Screen,
  SectionHeading,
  Text,
  useSurfaceStyle,
  type IconName,
} from '@/shared/ui';
import type { HairType, Maintenance, RecommendedHaircut, Vibe } from '../api/faceApi';
import { useFaceRecommendation, type FaceStep } from '../hooks/useFace';

const HAIR: HairType[] = ['STRAIGHT', 'WAVY', 'CURLY', 'COILY'];
const VIBES: Vibe[] = ['CLASSIC', 'MODERN'];
const MAINTENANCE: Maintenance[] = ['LOW', 'MEDIUM', 'HIGH'];
const THUMB = sizes.cover * 0.75;
const GUIDE = sizes.cover;
const STEPS: FaceStep[] = ['consent', 'scan', 'preferences', 'result'];
const STEP_ICON: Record<FaceStep, IconName> = {
  consent: 'shield-checkmark',
  scan: 'camera',
  preferences: 'options',
  result: 'sparkles',
};
const HAIR_ICON: Record<HairType, IconName> = {
  STRAIGHT: 'remove',
  WAVY: 'water',
  CURLY: 'infinite',
  COILY: 'cloud',
};
const MAINTENANCE_ICON: Record<Maintenance, IconName> = {
  LOW: 'leaf',
  MEDIUM: 'time',
  HIGH: 'diamond',
};

export interface FaceScreenProps {
  /** "Reservar este corte" with that barbershop (and barber, when chosen). */
  onBook: (input: { barbershopId: string; serviceId?: string | null; barberId?: string | null }) => void;
  onOpenBarber: (barberProfileId: string) => void;
}

/**
 * "Cortes para tu cara", in four numbered steps: consent, photos measured on the phone, optional
 * preferences, and the cuts with real photos and barbers nearby.
 */
export function FaceScreen({ onBook, onOpenBarber }: FaceScreenProps) {
  const { t } = useTranslation('face');
  const f = useFaceRecommendation();
  const theme = useTheme();
  return (
    <Screen>
      <View style={styles.content}>
        <Stepper current={f.step} />
        {f.message ? <Notice tone="warning" message={f.message} /> : null}

        {f.step === 'consent' ? (
          <>
            <BrandHero
              eyebrow={t('consent.eyebrow')}
              title={t('consent.title')}
              subtitle={t('consent.message')}
              icon="happy"
            />
            <View style={styles.list}>
              <Pledge icon="phone-portrait" title={t('consent.p1Title')} text={t('consent.p1')} />
              <Pledge icon="eye-off" title={t('consent.p2Title')} text={t('consent.p2')} />
              <Pledge icon="cut" title={t('consent.p3Title')} text={t('consent.p3')} />
            </View>
            <Button label={t('consent.accept')} icon="arrow-forward" onPress={f.accept} fullWidth />
          </>
        ) : null}

        {f.step === 'scan' ? (
          <>
            <ScanGuide done={f.shotsTaken} total={f.shots} />
            <View style={styles.center}>
              <Text variant="title" align="center">
                {t('scan.title')}
              </Text>
              <Text variant="caption" color="textSecondary" align="center">
                {t('scan.progress', { done: f.shotsTaken, total: f.shots })}
              </Text>
            </View>
            <View style={styles.tips}>
              <Tip icon="glasses" text={t('scan.tip1')} />
              <Tip icon="sunny" text={t('scan.tip2')} />
              <Tip icon="scan" text={t('scan.tip3')} />
            </View>
            {!f.available ? <Notice tone="info" message={t('scan.unavailable')} /> : null}
            <Button
              label={
                f.shotsTaken === 0
                  ? t('scan.take')
                  : t('scan.takeNext', { n: f.shotsTaken + 1, total: f.shots })
              }
              icon="camera"
              onPress={f.scan}
              loading={f.isScanning}
              disabled={!f.available}
              fullWidth
            />
          </>
        ) : null}

        {f.step === 'preferences' ? (
          <>
            <View style={styles.center}>
              <Icon name="checkmark-circle" size={sizes.iconLarge} color={theme.colors.success} />
              <Text variant="title" align="center">
                {t('prefs.title')}
              </Text>
              <Text color="textSecondary" align="center">
                {t('prefs.optional')}
              </Text>
            </View>
            <PrefGroup icon="color-wand" title={t('prefs.hair')}>
              {HAIR.map((h) => (
                <OptionTile
                  key={h}
                  icon={HAIR_ICON[h]}
                  label={t(`hair.${h}`)}
                  selected={f.hairType === h}
                  onPress={() => f.setHairType(f.hairType === h ? undefined : h)}
                />
              ))}
            </PrefGroup>
            <PrefGroup icon="shirt" title={t('prefs.vibe')}>
              {VIBES.map((v) => (
                <OptionTile
                  key={v}
                  icon={v === 'CLASSIC' ? 'ribbon' : 'flash'}
                  label={t(`vibe.${v}`)}
                  selected={f.vibe === v}
                  onPress={() => f.setVibe(f.vibe === v ? undefined : v)}
                />
              ))}
            </PrefGroup>
            <PrefGroup icon="hourglass" title={t('prefs.maintenance')}>
              {MAINTENANCE.map((m) => (
                <OptionTile
                  key={m}
                  icon={MAINTENANCE_ICON[m]}
                  label={t(`maintenance.${m}`)}
                  selected={f.maintenance === m}
                  onPress={() => f.setMaintenance(f.maintenance === m ? undefined : m)}
                />
              ))}
            </PrefGroup>
            <Tip icon="location" text={t('prefs.location')} />
            <Button
              label={t('prefs.see')}
              icon="sparkles"
              onPress={f.recommend}
              loading={f.isRecommending}
              fullWidth
            />
          </>
        ) : null}

        {f.step === 'result' && f.result ? (
          <Result
            result={f.result}
            canRemember={f.canRemember}
            onRemember={f.remember}
            remembering={f.isRemembering}
            onRestart={f.restart}
            onBook={(input, styleKey) => {
              f.track({ styleKey, kind: 'BOOK' });
              onBook(input);
            }}
            onOpenBarber={onOpenBarber}
            onViewPhoto={(imageId) => f.track({ imageId, kind: 'VIEW' })}
          />
        ) : null}
      </View>
    </Screen>
  );
}

/** Four numbered steps joined by a line; done ones in copper with a check. */
function Stepper({ current }: { current: FaceStep }) {
  const { t } = useTranslation('face');
  const theme = useTheme();
  const index = STEPS.indexOf(current);
  return (
    <View
      style={styles.stepper}
      accessible
      accessibilityLabel={t('steps.label', {
        n: index + 1,
        total: STEPS.length,
        name: t(`steps.${current}`),
      })}
    >
      {STEPS.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <View key={step} style={styles.step}>
            {i > 0 ? (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: i <= index ? theme.colors.primary : theme.colors.border },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.stepDot,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: done || active ? theme.colors.primary : theme.colors.surface,
                  borderColor: done || active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Icon
                name={done ? 'checkmark' : STEP_ICON[step]}
                size={sizes.icon - spacing.sm}
                color={done || active ? theme.colors.onPrimary : theme.colors.textMuted}
              />
            </View>
            <Text
              variant="caption"
              color={active ? 'primary' : 'textMuted'}
              numberOfLines={1}
              style={styles.stepLabel}
            >
              {t(`steps.${step}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** A privacy promise of the consent page. */
function Pledge({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const theme = useTheme();
  const surface = useSurfaceStyle();
  return (
    <View style={[styles.promise, surface]}>
      <View
        style={[
          styles.promiseIcon,
          { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
        ]}
      >
        <Icon name={icon} size={sizes.icon} color={theme.colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {text}
        </Text>
      </View>
    </View>
  );
}

/** A silhouette in a copper oval, with one mark per photo taken. */
function ScanGuide({ done, total }: { done: number; total: number }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <View
        style={[styles.guide, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl }]}
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.oval, { borderColor: theme.colors.brandAccent }]}>
          <Icon name="person" size={GUIDE * 0.55} color={theme.colors.brandAccent} />
        </View>
        <View style={styles.shots}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.shot,
                {
                  borderRadius: theme.radius.pill,
                  backgroundColor: i < done ? theme.colors.brandAccent : theme.colors.backdrop,
                },
              ]}
            >
              <Icon
                name={i < done ? 'checkmark' : 'camera-outline'}
                size={sizes.icon - spacing.sm}
                color={i < done ? theme.colors.brand : theme.colors.onBrand}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Tip({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.tip}>
      <Icon name={icon} size={sizes.icon - spacing.xs} color={theme.colors.primary} />
      <Text color="textSecondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

function PrefGroup({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <SectionHeading icon={icon} title={title} />
      <View style={styles.tiles}>{children}</View>
    </View>
  );
}

/** A choice as a tile with its icon; the selected one fills with copper. */
function OptionTile({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.tile,
        {
          borderRadius: theme.radius.lg,
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <Icon name={icon} size={sizes.icon} color={selected ? theme.colors.onPrimary : theme.colors.primary} />
      <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'} align="center" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function Result({
  result,
  canRemember,
  onRemember,
  remembering,
  onRestart,
  onBook,
  onOpenBarber,
  onViewPhoto,
}: {
  result: NonNullable<ReturnType<typeof useFaceRecommendation>['result']>;
  canRemember: boolean;
  onRemember: (
    shape: NonNullable<ReturnType<typeof useFaceRecommendation>['result']>['faceShape']['shape'],
  ) => void;
  remembering: boolean;
  onRestart: () => void;
  onBook: FaceScreenProps['onBook'] extends (i: infer I) => void
    ? (input: I, styleKey: string) => void
    : never;
  onOpenBarber: (id: string) => void;
  onViewPhoto: (imageId: string) => void;
}) {
  const { t } = useTranslation('face');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const [consent, setConsent] = useState(false);
  const shape = result.faceShape;
  const mixed = shape.certainty === 'LOW' && shape.alternatives[0];
  return (
    <View style={styles.content}>
      <BrandHero
        eyebrow={mixed ? t('result.mixedTitle') : t('result.yourShape')}
        title={
          mixed
            ? t('result.between', {
                a: t(`shapes.${shape.shape}`),
                b: t(`shapes.${shape.alternatives[0]!.shape}`),
              })
            : t(`shapes.${shape.shape}`)
        }
        icon="happy"
      >
        <View
          style={[
            styles.certainty,
            {
              borderRadius: theme.radius.pill,
              backgroundColor:
                shape.certainty === 'LOW' ? theme.colors.statusPendingBg : theme.colors.brandAccent,
            },
          ]}
        >
          <Icon
            name={
              shape.certainty === 'HIGH'
                ? 'shield-checkmark'
                : shape.certainty === 'MEDIUM'
                  ? 'checkmark'
                  : 'git-compare'
            }
            size={sizes.icon - spacing.sm}
            color={shape.certainty === 'LOW' ? theme.colors.statusPendingFg : theme.colors.brand}
          />
          <Text
            variant="caption"
            style={{ color: shape.certainty === 'LOW' ? theme.colors.statusPendingFg : theme.colors.brand }}
          >
            {t(`result.certainty.${shape.certainty}`)}
          </Text>
        </View>
        {shape.certainty !== 'LOW' && shape.alternatives.length > 0 ? (
          <Text variant="caption" color="onBrand">
            {t('result.alsoCould', {
              shapes: shape.alternatives.map((a) => t(`shapes.${a.shape}`)).join(', '),
            })}
          </Text>
        ) : null}
      </BrandHero>
      {shape.traits.length > 0 ? (
        <View style={[styles.why, surface]}>
          <SectionHeading icon="bulb" title={t('result.why')} />
          {shape.traits.map((trait) => (
            <View key={trait.key} style={styles.tip}>
              <Icon name="checkmark-circle" size={sizes.icon - spacing.xs} color={theme.colors.success} />
              <Text style={styles.flex}>{trait.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <SectionHeading icon="cut" title={t('result.cutsTitle')} hint={result.disclaimer} />
      {result.haircuts.map((cut, i) => (
        <HaircutCard
          key={cut.style.id}
          rank={i + 1}
          cut={cut}
          onBook={onBook}
          onOpenBarber={onOpenBarber}
          onViewPhoto={onViewPhoto}
        />
      ))}
      {canRemember ? (
        <View style={[styles.why, surface]}>
          <SectionHeading icon="bookmark" title={t('result.remember')} />
          <Checkbox label={t('result.rememberConsent')} checked={consent} onChange={setConsent} />
          <Button
            label={t('result.remember')}
            variant="secondary"
            disabled={!consent}
            loading={remembering}
            onPress={() => onRemember(shape.shape)}
          />
        </View>
      ) : null}
      <Button label={t('result.again')} variant="ghost" icon="refresh" onPress={onRestart} />
    </View>
  );
}

function HaircutCard({
  cut,
  rank,
  onBook,
  onOpenBarber,
  onViewPhoto,
}: {
  cut: RecommendedHaircut;
  rank: number;
  onBook: (
    input: { barbershopId: string; serviceId?: string | null; barberId?: string | null },
    styleKey: string,
  ) => void;
  onOpenBarber: (id: string) => void;
  onViewPhoto: (imageId: string) => void;
}) {
  const { t } = useTranslation('face');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  return (
    <View style={[styles.cut, surface]} testID={`haircut-${cut.style.key}`}>
      <View style={styles.row}>
        <View style={[styles.rank, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.pill }]}>
          <Text variant="label" color="brandAccent">
            {String(rank)}
          </Text>
        </View>
        <Text variant="subtitle" style={styles.flex} numberOfLines={2}>
          {cut.style.name}
        </Text>
        <View
          style={[
            styles.match,
            { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.pill },
          ]}
        >
          <Text variant="label" color="primary">
            {t('result.match', { percent: cut.compatibility })}
          </Text>
        </View>
      </View>
      {/* Compatibility bar: the number from the API, drawn. */}
      <View
        style={[styles.bar, { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.pill }]}
      >
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.max(0, Math.min(100, cut.compatibility))}%`,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.pill,
            },
          ]}
        />
      </View>
      <Text color="textSecondary">{cut.reason}</Text>
      {cut.maintenance || !cut.ruleValidated ? (
        <View style={styles.row}>
          {cut.maintenance ? <Badge label={t(`maintenance.${cut.maintenance}`)} /> : null}
          {!cut.ruleValidated ? <Badge label={t('result.notValidated')} tone="warning" /> : null}
        </View>
      ) : null}
      {cut.photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.photos}
        >
          {cut.photos.map((photo) => (
            <Pressable
              key={photo.id}
              onPress={() => onViewPhoto(photo.id)}
              accessibilityRole="image"
              accessibilityLabel={photo.barberName ?? cut.style.name}
            >
              <Image
                source={{ uri: mediaUrl(photo.thumbUrl) ?? undefined }}
                style={[
                  styles.photo,
                  { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceMuted },
                ]}
              />
              {photo.isDemo ? (
                <View style={styles.demo}>
                  <Badge label={t('result.example')} />
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {cut.barbers.map((b) => (
        <View
          key={`${b.barberProfileId}-${b.barberId}`}
          style={[
            styles.barber,
            { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.lg },
          ]}
        >
          <View style={styles.row}>
            <Monogram name={b.displayName} size={sizes.avatarSmall} />
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {b.displayName}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={2}>
                {b.summary}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            {b.barberProfileId ? (
              <Button
                label={t('result.profile')}
                variant="ghost"
                onPress={() => onOpenBarber(b.barberProfileId!)}
              />
            ) : null}
            <Button
              label={t('result.book')}
              icon="calendar"
              onPress={() =>
                onBook(
                  {
                    barbershopId: b.barbershopId,
                    barberId: b.barberId,
                    serviceId: cut.photos.find((p) => p.serviceId)?.serviceId ?? null,
                  },
                  cut.style.key,
                )
              }
            />
          </View>
        </View>
      ))}
      {cut.barbers.length === 0 && cut.photos[0]?.barbershopId ? (
        <Button
          label={t('result.bookAt', { name: cut.photos[0].barbershopName ?? '' })}
          icon="calendar"
          onPress={() =>
            onBook(
              { barbershopId: cut.photos[0]!.barbershopId, serviceId: cut.photos[0]!.serviceId },
              cut.style.key,
            )
          }
        />
      ) : null}
      {cut.photos[0]?.distanceMeters != null ? (
        <View style={styles.tip}>
          <Icon name="navigate" size={sizes.icon - spacing.sm} color={theme.colors.textMuted} />
          <Text variant="caption" color="textMuted">
            {t('result.nearest', { distance: formatDistance(cut.photos[0].distanceMeters) })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  list: { gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  stepper: { flexDirection: 'row' },
  step: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  stepLine: {
    position: 'absolute',
    height: sizes.borderWidth * 2,
    top: touchTarget / 3,
    right: '50%',
    left: '-50%',
  },
  stepDot: {
    width: (touchTarget * 2) / 3,
    height: (touchTarget * 2) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.borderWidth,
  },
  stepLabel: { paddingHorizontal: spacing.xxs },
  promise: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  promiseIcon: {
    width: sizes.avatarSmall,
    height: sizes.avatarSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: { width: GUIDE * 1.6, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  oval: {
    width: GUIDE * 0.75,
    height: GUIDE,
    borderRadius: GUIDE / 2,
    borderWidth: sizes.borderWidth * 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  shots: { flexDirection: 'row', gap: spacing.sm },
  shot: {
    width: touchTarget * 0.7,
    height: touchTarget * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tips: { gap: spacing.sm },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  group: { gap: spacing.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '22%',
    minHeight: touchTarget * 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: sizes.borderWidth,
  },
  certainty: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  why: { padding: spacing.md, gap: spacing.sm },
  cut: { padding: spacing.md, gap: spacing.sm },
  rank: {
    width: sizes.avatarSmall * 0.75,
    height: sizes.avatarSmall * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  match: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  bar: { height: spacing.xs, overflow: 'hidden' },
  barFill: { height: '100%' },
  bleed: { marginHorizontal: -spacing.md },
  photos: { gap: spacing.sm, paddingHorizontal: spacing.md },
  photo: { width: THUMB, height: THUMB * 1.25 },
  demo: { position: 'absolute', top: spacing.xs, left: spacing.xs },
  barber: { padding: spacing.sm, gap: spacing.xs },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs, flexWrap: 'wrap' },
});
