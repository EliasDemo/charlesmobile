import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useTranslation } from '@/shared/i18n';
import { haptic, useAppSettings } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { Celebration } from './Celebration';
import { Icon, type IconName } from './Icon';
import { FadeIn } from './motion';
import { Text } from './Text';

export interface UnlockItem {
  icon: IconName;
  title: string;
  text?: string;
  /** "Ir": opens that function. */
  onPress?: () => void;
}

export interface Unlock {
  /** Shown once per device (Ajustes → "Ver el tutorial otra vez" shows them again). */
  id: string;
  title: string;
  text: string;
  items: UnlockItem[];
}

const useUnlockStore = create<{ current: Unlock | null }>(() => ({ current: null }));

/**
 * "Desbloqueaste…": what a change opened (barbershop mode, a new barbershop, a better plan), with a
 * shortcut to each function. Only the first time for each `id`.
 */
export function showUnlocked(unlock: Unlock) {
  if (useAppSettings.getState().toursSeen.includes(unlock.id)) return;
  if (useUnlockStore.getState().current) return;
  useUnlockStore.setState({ current: unlock });
}

/** Mounted once in the root layout. */
export function UnlockHost() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const current = useUnlockStore((s) => s.current);
  const close = () => {
    if (current) useAppSettings.getState().markTour(current.id);
    useUnlockStore.setState({ current: null });
  };
  return (
    <Modal
      visible={current !== null}
      transparent
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <Celebration visible={current !== null} />
        {current ? (
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingBottom: spacing.xl + insets.bottom,
              },
            ]}
          >
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.pill },
              ]}
            >
              <Icon name="sparkles" size={sizes.iconLarge} color={theme.colors.primary} />
            </View>
            <Text variant="title" align="center">
              {current.title}
            </Text>
            <Text color="textSecondary" align="center">
              {current.text}
            </Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {current.items.map((item, i) => (
                <FadeIn key={item.title} index={i}>
                  <Pressable
                    accessibilityRole={item.onPress ? 'button' : undefined}
                    disabled={!item.onPress}
                    onPress={() => {
                      haptic('light');
                      close();
                      item.onPress?.();
                    }}
                    style={({ pressed }) => [
                      styles.item,
                      {
                        borderColor: pressed ? theme.colors.primary : theme.colors.border,
                        borderRadius: theme.radius.lg,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.itemIcon,
                        { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
                      ]}
                    >
                      <Icon name={item.icon} size={sizes.icon} color={theme.colors.primary} />
                    </View>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{item.title}</Text>
                      {item.text ? (
                        <Text variant="caption" color="textSecondary">
                          {item.text}
                        </Text>
                      ) : null}
                    </View>
                    {item.onPress ? (
                      <Text variant="label" color="primary">
                        {t('unlock.go')}
                      </Text>
                    ) : null}
                  </Pressable>
                </FadeIn>
              ))}
            </ScrollView>
            <Button label={t('unlock.done')} onPress={close} fullWidth />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '88%',
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  badge: {
    alignSelf: 'center',
    width: sizes.iconLarge + spacing.xl,
    height: sizes.iconLarge + spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 0 },
  listContent: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: touchTarget,
    borderWidth: sizes.borderWidth,
  },
  itemIcon: {
    width: sizes.avatarSmall,
    height: sizes.avatarSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
