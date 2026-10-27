import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Card, Icon, Text } from '@/shared/ui';
import type { BarberProfile } from '../api/careerApi';
import { RANKING_MIN_REVIEWS, type CareerStep } from '../hooks/useCareerProgress';

/**
 * The barber's own progress, instead of a ranking position that discourages a newcomer: the way
 * into the ranking (reviews so far out of 3) and the steps they control today, each with its action.
 * Once in the ranking, their position.
 */
export function CareerProgressCard({
  profile,
  steps,
}: {
  profile: BarberProfile;
  steps: (CareerStep & { onPress?: () => void })[];
}) {
  const { t } = useTranslation('career');
  const theme = useTheme();
  const reviews = Math.min(profile.ratingCount, RANKING_MIN_REVIEWS);
  const done = steps.filter((s) => s.done).length;
  return (
    <Card style={styles.card}>
      {profile.rank !== null ? (
        <View style={styles.row}>
          <Icon name="trophy" size={sizes.icon} color={theme.colors.primary} />
          <Text variant="subtitle" color="primary" style={styles.flex}>
            {t('rank', { rank: profile.rank })}
          </Text>
        </View>
      ) : (
        <View style={styles.block}>
          <Text variant="subtitle">{t('progress.title')}</Text>
          <Text color="textSecondary">{t('progress.reviews', { count: RANKING_MIN_REVIEWS - reviews })}</Text>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: RANKING_MIN_REVIEWS, now: reviews }}
            style={[styles.bar, { backgroundColor: theme.colors.border, borderRadius: theme.radius.pill }]}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(1, reviews / RANKING_MIN_REVIEWS) * 100}%`,
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.pill,
                },
              ]}
            />
          </View>
          <Text variant="caption" color="textSecondary">
            {t('progress.reviewsCount', { current: reviews, total: RANKING_MIN_REVIEWS })}
          </Text>
        </View>
      )}
      <View style={styles.block}>
        <Text variant="bodyStrong">{t('progress.stepsTitle', { done, total: steps.length })}</Text>
        <Text variant="caption" color="textSecondary">
          {done === steps.length ? t('progress.allDone') : t('progress.stepsHint')}
        </Text>
        {steps.map((step) => (
          <Pressable
            key={step.key}
            accessibilityRole="button"
            accessibilityState={{ checked: step.done, disabled: step.done || !step.onPress }}
            disabled={step.done || !step.onPress}
            onPress={step.onPress}
            style={styles.step}
            testID={`career-step-${step.key}`}
          >
            <Icon
              name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={sizes.icon}
              color={step.done ? theme.colors.success : theme.colors.textMuted}
            />
            <Text style={styles.flex} color={step.done ? 'textSecondary' : 'textPrimary'}>
              {t(`progress.steps.${step.key}`)}
            </Text>
            {step.done || !step.onPress ? null : (
              <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.textMuted} />
            )}
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  block: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  bar: { height: spacing.sm, overflow: 'hidden' },
  fill: { height: '100%' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touchTarget },
});
