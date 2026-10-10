import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Button } from './Button';
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
  /** Extra content between the message and the buttons (for example, a required reason). */
  children?: ReactNode;
  confirmDisabled?: boolean;
}

/** Confirmation for irreversible actions (CLAUDE.md §6). Same look on Android and iOS. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive,
  loading,
  children,
  confirmDisabled,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}
        onPress={loading ? undefined : onCancel}
        accessibilityLabel={t('actions.cancel')}
      >
        <Pressable
          accessibilityRole="alert"
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text variant="subtitle">{title}</Text>
          <Text color="textSecondary">{message}</Text>
          {children}
          <View style={styles.actions}>
            <Button label={t('actions.cancel')} variant="ghost" onPress={onCancel} disabled={loading} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              disabled={confirmDisabled}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  dialog: {
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: sizes.borderWidth,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
});
