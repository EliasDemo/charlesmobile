import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Button, Icon, Text, useSurfaceStyle } from '@/shared/ui';
import type { ManagedShop } from '../api/shopApi';
import { READINESS_TARGET, useReadiness, type ReadinessTarget } from '../hooks/useReadiness';

/**
 * "¿Tus clientes pueden reservar?": each requirement with ✓ or what is missing and a button to
 * fix it. Hidden once everything is ready.
 */
export function ReadinessCard({
  shop,
  onFix,
}: {
  shop: ManagedShop;
  onFix: (target: ReadinessTarget) => void;
}) {
  const { t } = useTranslation('shop');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const { ready, checks } = useReadiness(shop);
  if (ready !== false) return null;
  return (
    <View
      style={[styles.card, surface, { borderColor: theme.colors.warning, borderWidth: sizes.borderWidth }]}
      testID="readiness-card"
    >
      <Text variant="subtitle">{t('readiness.title')}</Text>
      <Text color="textSecondary">{t('readiness.subtitle')}</Text>
      {checks.map((check) => (
        <View key={check.key} style={styles.row}>
          <Icon
            name={check.ok ? 'checkmark-circle' : 'alert-circle'}
            size={sizes.icon}
            color={check.ok ? theme.colors.success : theme.colors.warning}
          />
          <View style={styles.flex}>
            <Text color={check.ok ? 'textSecondary' : 'textPrimary'}>
              {check.ok
                ? t(`readiness.ok.${check.key}`)
                : check.key === 'barberServices'
                  ? t('readiness.missing.barberServices', { names: check.names.join(', ') })
                  : t(`readiness.missing.${check.key}`)}
            </Text>
            {!check.ok ? (
              <Button
                label={t(`readiness.fix.${check.key}`)}
                variant="secondary"
                onPress={() => onFix(READINESS_TARGET[check.key])}
              />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1, gap: spacing.xs },
});
