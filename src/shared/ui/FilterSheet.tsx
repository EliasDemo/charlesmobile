import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

/** "Filtros" with how many are on: one compact button instead of rows of chips. */
export function FilterButton({ active, onPress }: { active: number; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const on = active > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? t('filters.withCount', { count: active }) : t('filters.title')}
      onPress={onPress}
      style={[
        styles.button,
        {
          borderRadius: theme.radius.pill,
          borderColor: on ? theme.colors.primary : theme.colors.border,
          backgroundColor: on ? theme.colors.primarySoft : theme.colors.surface,
        },
      ]}
      testID="filter-button"
    >
      <Icon name="options" size={sizes.icon} color={on ? theme.colors.primary : theme.colors.textPrimary} />
      <Text variant="label" color={on ? 'primary' : 'textPrimary'}>
        {on ? t('filters.withCount', { count: active }) : t('filters.title')}
      </Text>
    </Pressable>
  );
}

/** A titled group of options inside the filter sheet. */
export function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

/** Sheet from the bottom with the filters, "Limpiar" and "Ver resultados". */
export function FilterSheet({
  visible,
  onClose,
  onClear,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onClear: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}
        onPress={onClose}
        accessibilityLabel={t('actions.close')}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingBottom: spacing.md + insets.bottom,
            },
          ]}
        >
          <View style={styles.header}>
            <Text variant="title" style={styles.flex}>
              {t('filters.title')}
            </Text>
            <Button label={t('filters.clear')} variant="ghost" onPress={onClear} />
          </View>
          <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
          <Button label={t('filters.apply')} onPress={onClose} fullWidth />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    borderWidth: sizes.borderWidth,
    alignSelf: 'flex-start',
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  body: { gap: spacing.lg, paddingBottom: spacing.sm },
  group: { gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
