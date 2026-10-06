import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing, touchTarget } from '@/shared/theme';
import { Text } from './Text';
import { TextField, type TextFieldProps } from './TextField';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'secureTextEntry' | 'accessory'> {
  /** `new-password` lets the system suggest a strong password. */
  purpose?: 'current' | 'new';
}

export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField(
  { purpose = 'current', ...props },
  ref,
) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      ref={ref}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={purpose === 'new' ? 'new-password' : 'current-password'}
      textContentType={purpose === 'new' ? 'newPassword' : 'password'}
      accessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? t('form.hidePassword') : t('form.showPassword')}
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
        >
          <Text variant="label" color="primary">
            {visible ? t('form.hide') : t('form.show')}
          </Text>
        </Pressable>
      }
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  toggle: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
