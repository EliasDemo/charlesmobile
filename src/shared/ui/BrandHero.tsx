import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * Navy brand banner with copper rings: the opening of a section (Tienda, Foros). Text always on
 * `onBrand`, so it reads in both themes.
 */
export function BrandHero({
  eyebrow,
  title,
  subtitle,
  icon,
  children,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  children?: ReactNode;
  compact?: boolean;
}) {
  const theme = useTheme();
  const ring = sizes.cover;
  return (
    <View
      style={[
        styles.hero,
        compact && styles.compact,
        { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl },
      ]}
    >
      {/* Decorative rings, hidden from screen readers. */}
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.ring,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            borderColor: theme.colors.brandAccent,
            right: -ring / 3,
            top: -ring / 2,
          },
        ]}
      />
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.ring,
          styles.faint,
          {
            width: ring * 0.6,
            height: ring * 0.6,
            borderRadius: ring * 0.3,
            borderColor: theme.colors.brandAccent,
            right: ring / 6,
            bottom: -ring / 4,
          },
        ]}
      />
      <View style={styles.top}>
        <View style={styles.flex}>
          {eyebrow ? (
            <Text variant="caption" color="brandAccent" numberOfLines={1} style={styles.eyebrow}>
              {eyebrow}
            </Text>
          ) : null}
          <Text variant={compact ? 'title' : 'display'} color="onBrand" numberOfLines={2}>
            {title}
          </Text>
        </View>
        {icon ? (
          <View
            style={[styles.icon, { borderColor: theme.colors.brandAccent, borderRadius: theme.radius.pill }]}
          >
            <Icon name={icon} size={sizes.icon} color={theme.colors.brandAccent} />
          </View>
        ) : null}
      </View>
      {subtitle ? (
        <Text color="onBrand" style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, gap: spacing.sm, overflow: 'hidden' },
  compact: { padding: spacing.md },
  ring: { position: 'absolute', borderWidth: sizes.borderWidth * 2, opacity: 0.35 },
  faint: { opacity: 0.18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  icon: {
    width: sizes.avatar,
    height: sizes.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.borderWidth,
  },
  subtitle: { opacity: 0.85 },
});
