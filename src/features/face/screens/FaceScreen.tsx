import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { formatDistance } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  Icon,
  Notice,
  Screen,
  Text,
  useSurfaceStyle,
} from '@/shared/ui';
import type { HairType, Maintenance, RecommendedHaircut, Vibe } from '../api/faceApi';
import { useFaceRecommendation } from '../hooks/useFace';

const HAIR: HairType[] = ['STRAIGHT', 'WAVY', 'CURLY', 'COILY'];
const VIBES: Vibe[] = ['CLASSIC', 'MODERN'];
const MAINTENANCE: Maintenance[] = ['LOW', 'MEDIUM', 'HIGH'];
const THUMB = sizes.cover * 0.6;

export interface FaceScreenProps {
  /** "Reservar este corte" with that barbershop (and barber, when chosen). */
  onBook: (input: { barbershopId: string; serviceId?: string | null; barberId?: string | null }) => void;
  onOpenBarber: (barberProfileId: string) => void;
}

/** "Cortes para tu cara": consent, a selfie measured on the phone, and suggestions nearby. */
export function FaceScreen({ onBook, onOpenBarber }: FaceScreenProps) {
  const { t } = useTranslation('face');
  const f = useFaceRecommendation();
  const theme = useTheme();
  return (
    <Screen>
      {f.message ? <Notice tone="warning" message={f.message} /> : null}
      {f.step === 'consent' ? (
        <Card>
          <View style={styles.center}>
            <Icon name="happy" size={sizes.iconLarge} color={theme.colors.primary} />
          </View>
          <Text variant="title" align="center">
            {t('consent.title')}
          </Text>
          <Text align="center" color="textSecondary">
            {t('consent.message')}
          </Text>
          <Button label={t('consent.accept')} onPress={f.accept} fullWidth />
        </Card>
      ) : null}

      {f.step === 'scan' ? (
        <Card>
          <Text variant="title">{t('scan.title')}</Text>
          {(['tip1', 'tip2', 'tip3'] as const).map((k) => (
            <Text key={k} color="textSecondary">{`• ${t(`scan.${k}`)}`}</Text>
          ))}
          {!f.available ? <Notice tone="info" message={t('scan.unavailable')} /> : null}
          <Button
            label={t('scan.take')}
            icon="camera"
            onPress={f.scan}
            loading={f.isScanning}
            disabled={!f.available}
            fullWidth
          />
        </Card>
      ) : null}

      {f.step === 'preferences' ? (
        <Card>
          <Text variant="title">{t('prefs.title')}</Text>
          <Text color="textSecondary">{t('prefs.optional')}</Text>
          <Text variant="label" color="textSecondary">
            {t('prefs.hair')}
          </Text>
          <View style={styles.chips}>
            {HAIR.map((h) => (
              <Chip
                key={h}
                label={t(`hair.${h}`)}
                selected={f.hairType === h}
                onPress={() => f.setHairType(f.hairType === h ? undefined : h)}
              />
            ))}
          </View>
          <Text variant="label" color="textSecondary">
            {t('prefs.vibe')}
          </Text>
          <View style={styles.chips}>
            {VIBES.map((v) => (
              <Chip
                key={v}
                label={t(`vibe.${v}`)}
                selected={f.vibe === v}
                onPress={() => f.setVibe(f.vibe === v ? undefined : v)}
              />
            ))}
          </View>
          <Text variant="label" color="textSecondary">
            {t('prefs.maintenance')}
          </Text>
          <View style={styles.chips}>
            {MAINTENANCE.map((m) => (
              <Chip
                key={m}
                label={t(`maintenance.${m}`)}
                selected={f.maintenance === m}
                onPress={() => f.setMaintenance(f.maintenance === m ? undefined : m)}
              />
            ))}
          </View>
          <Text variant="caption" color="textMuted">
            {t('prefs.location')}
          </Text>
          <Button
            label={t('prefs.see')}
            icon="sparkles"
            onPress={f.recommend}
            loading={f.isRecommending}
            fullWidth
          />
        </Card>
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
    </Screen>
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
  return (
    <View style={styles.content}>
      <View style={[styles.hero, surface, { backgroundColor: theme.colors.primarySoft }]}>
        <Text variant="caption" color="primary">
          {t('result.yourShape')}
        </Text>
        <Text variant="hero" color="primary">
          {t(`shapes.${shape.shape}`)}
        </Text>
        <Text color="textSecondary">
          {t('result.confidence', { percent: Math.round(shape.confidence * 100) })}
        </Text>
        {shape.alternatives.length > 0 ? (
          <Text variant="caption" color="textSecondary">
            {t('result.alsoCould', {
              shapes: shape.alternatives.map((a) => t(`shapes.${a.shape}`)).join(', '),
            })}
          </Text>
        ) : null}
      </View>
      <Notice tone="info" message={result.disclaimer} />
      {result.haircuts.map((cut) => (
        <HaircutCard
          key={cut.style.id}
          cut={cut}
          onBook={onBook}
          onOpenBarber={onOpenBarber}
          onViewPhoto={onViewPhoto}
        />
      ))}
      {canRemember ? (
        <Card>
          <Checkbox label={t('result.rememberConsent')} checked={consent} onChange={setConsent} />
          <Button
            label={t('result.remember')}
            variant="secondary"
            disabled={!consent}
            loading={remembering}
            onPress={() => onRemember(shape.shape)}
          />
        </Card>
      ) : null}
      <Button label={t('result.again')} variant="ghost" icon="refresh" onPress={onRestart} />
    </View>
  );
}

function HaircutCard({
  cut,
  onBook,
  onOpenBarber,
  onViewPhoto,
}: {
  cut: RecommendedHaircut;
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
        <Text variant="subtitle" style={styles.flex}>
          {cut.style.name}
        </Text>
        <Badge label={t('result.match', { percent: cut.compatibility })} tone="primary" />
      </View>
      <Text>{cut.reason}</Text>
      <Text variant="caption" color="textSecondary">
        {[
          cut.maintenance ? t(`maintenance.${cut.maintenance}`) : null,
          cut.ruleValidated ? null : t('result.notValidated'),
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {cut.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {cut.photos.map((photo) => (
            <View key={photo.id} onTouchEnd={() => onViewPhoto(photo.id)}>
              <Image
                source={{ uri: mediaUrl(photo.thumbUrl) ?? undefined }}
                style={[styles.photo, { borderRadius: theme.radius.md }]}
                accessibilityLabel={photo.barberName ?? cut.style.name}
              />
              {photo.isDemo ? (
                <View style={styles.demo}>
                  <Badge label={t('result.example')} />
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}
      {cut.barbers.map((b) => (
        <Card key={`${b.barberProfileId}-${b.barberId}`}>
          <Text variant="bodyStrong">{b.displayName}</Text>
          <Text variant="caption" color="textSecondary">
            {b.summary}
          </Text>
          <View style={styles.row}>
            {b.barberProfileId ? (
              <Button
                label={t('result.profile')}
                variant="ghost"
                onPress={() => onOpenBarber(b.barberProfileId!)}
              />
            ) : null}
            <Button
              label={t('result.book')}
              variant="secondary"
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
        </Card>
      ))}
      {cut.barbers.length === 0 && cut.photos[0]?.barbershopId ? (
        <Button
          label={t('result.bookAt', { name: cut.photos[0].barbershopName ?? '' })}
          variant="secondary"
          onPress={() =>
            onBook(
              { barbershopId: cut.photos[0]!.barbershopId, serviceId: cut.photos[0]!.serviceId },
              cut.style.key,
            )
          }
        />
      ) : null}
      {cut.photos[0]?.distanceMeters != null ? (
        <Text variant="caption" color="textMuted">
          {t('result.nearest', { distance: formatDistance(cut.photos[0].distanceMeters) })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  center: { alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hero: { padding: spacing.lg, gap: spacing.xs, alignItems: 'center' },
  cut: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  flex: { flex: 1 },
  photos: { gap: spacing.sm },
  photo: { width: THUMB, height: THUMB },
  demo: { position: 'absolute', top: spacing.xs, left: spacing.xs },
});
