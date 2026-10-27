import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { haptic } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { KeyboardAvoider } from './keyboard';
import { Text } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  /** What will happen if the user confirms (consequences, amounts…). */
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  loading?: boolean;
  /** Icon on top; by default a warning for destructive actions and a question otherwise. */
  icon?: IconName;
  /** Extra content between the message and the buttons (for example, a required reason). */
  children?: ReactNode;
  confirmDisabled?: boolean;
  /** Says "No se puede deshacer" under the title. By default, every destructive action. */
  irreversible?: boolean;
}

/**
 * Confirmation for important actions (CLAUDE.md §6), as a sheet from the bottom: big icon, the
 * consequence in plain words, and the buttons within thumb reach. Same look on Android and iOS.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive,
  loading,
  icon,
  children,
  confirmDisabled,
  irreversible = destructive,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // The content scrolls on small phones (long reasons, notes): the buttons always stay in view.
  const { height } = useWindowDimensions();
  // Drag the sheet down to dismiss it (like the close button); it springs back if released early.
  const dragY = useSharedValue(0);
  const dismiss = () => {
    if (!loading) onCancel();
  };
  const drag = Gesture.Pan()
    .activeOffsetY(DRAG_ACTIVATION)
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DRAG_TO_CLOSE) runOnJS(dismiss)();
      dragY.value = withSpring(0);
    });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));
  const tint = destructive ? theme.colors.danger : theme.colors.primary;
  const tintSoft = destructive ? theme.colors.statusDangerBg : theme.colors.primarySoft;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardAvoider style={styles.flex}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}
            onPress={loading ? undefined : onCancel}
            accessibilityLabel={t('actions.cancel')}
          >
            <GestureDetector gesture={drag}>
              <Animated.View style={dragStyle}>
                <Pressable
                  accessibilityRole="alert"
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
                      styles.handle,
                      { backgroundColor: theme.colors.border, borderRadius: theme.radius.pill },
                    ]}
                  />
                  <View
                    importantForAccessibility="no-hide-descendants"
                    style={[styles.icon, { backgroundColor: tintSoft, borderRadius: theme.radius.pill }]}
                  >
                    <Icon
                      name={icon ?? (destructive ? 'alert-circle' : 'help-circle')}
                      size={sizes.iconLarge}
                      color={tint}
                    />
                  </View>
                  <Text variant="title" align="center">
                    {title}
                  </Text>
                  {irreversible ? (
                    <View
                      style={[
                        styles.irreversible,
                        { backgroundColor: theme.colors.statusDangerBg, borderRadius: theme.radius.pill },
                      ]}
                    >
                      <Icon
                        name="warning"
                        size={theme.typography.caption.fontSize}
                        color={theme.colors.statusDangerFg}
                      />
                      <Text variant="caption" color="danger">
                        {t('confirm.irreversible')}
                      </Text>
                    </View>
                  ) : null}
                  <ScrollView
                    style={{ maxHeight: height * MAX_CONTENT_RATIO }}
                    contentContainerStyle={styles.body}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View
                      style={[
                        styles.message,
                        {
                          backgroundColor: destructive
                            ? theme.colors.statusDangerBg
                            : theme.colors.surfaceMuted,
                          borderRadius: theme.radius.md,
                        },
                      ]}
                    >
                      <Text color="textPrimary" align="center">
                        {message}
                      </Text>
                    </View>
                    {children}
                  </ScrollView>
                  <View style={styles.actions}>
                    <Button
                      label={confirmLabel}
                      variant={destructive ? 'danger' : 'primary'}
                      onPress={() => {
                        haptic(destructive ? 'warning' : 'light');
                        onConfirm();
                      }}
                      loading={loading}
                      disabled={confirmDisabled}
                      fullWidth
                    />
                    <Button
                      label={t('actions.cancel')}
                      variant="secondary"
                      onPress={onCancel}
                      disabled={loading}
                      fullWidth
                    />
                  </View>
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </Pressable>
        </KeyboardAvoider>
      </GestureHandlerRootView>
    </Modal>
  );
}

const DRAG_ACTIVATION = 12;
const MAX_CONTENT_RATIO = 0.45;
const DRAG_TO_CLOSE = 120;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  handle: { alignSelf: 'center', width: spacing.xxxl, height: spacing.xs, marginBottom: spacing.sm },
  icon: {
    alignSelf: 'center',
    width: sizes.iconLarge + spacing.xl,
    height: sizes.iconLarge + spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  body: { gap: spacing.md },
  message: { padding: spacing.md },
  irreversible: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
});
