import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Button, Icon, Text, useSurfaceStyle } from '@/shared/ui';
import { READINESS_TARGET, useReadiness, type ReadinessTarget } from '../hooks/useReadiness';

/**
 * "¿Tus clientes pueden reservar?": what the backend says is missing (blocking first), each with a
 * button to fix it. Hidden when there is nothing to say.
 */
export function ReadinessCard({
  shopId,
  onFix,
}: {
  shopId: string;
  onFix: (target: ReadinessTarget) => void;
}) {
  const { t } = useTranslation('shop');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const { ready, bookableBarbers, issues } = useReadiness(shopId);
  if (ready === null || issues.length === 0) return null;
  const tone = ready ? theme.colors.primary : theme.colors.warning;
  return (
    <View
      style={[styles.card, surface, { borderColor: tone, borderWidth: sizes.borderWidth }]}
      testID="readiness-card"
    >
      <Text variant="subtitle">{ready ? t('readiness.readyTitle') : t('readiness.title')}</Text>
      <Text color="textSecondary">
        {ready ? t('readiness.bookable', { count: bookableBarbers }) : t('readiness.subtitle')}
      </Text>
      {issues.map((issue, i) => {
        const blocking = issue.severity === 'BLOCKING';
        return (
          <View key={`${issue.code}-${issue.barberId ?? i}`} style={styles.row}>
            <Icon
              name={blocking ? 'alert-circle' : 'information-circle'}
              size={sizes.icon}
              color={blocking ? theme.colors.warning : theme.colors.textMuted}
            />
            <View style={styles.flex}>
              <Text>{issue.message}</Text>
              <Button
                label={t(`readiness.fixTarget.${READINESS_TARGET[issue.code]}`)}
                variant={blocking ? 'secondary' : 'ghost'}
                onPress={() => onFix(READINESS_TARGET[issue.code])}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1, gap: spacing.xs },
});
