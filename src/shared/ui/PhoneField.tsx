import { forwardRef } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatPeruNational } from '@/shared/lib';
import { spacing, useTheme } from '@/shared/theme';
import { Text } from './Text';
import { TextField, type TextFieldProps } from './TextField';

export type PhoneFieldProps = Omit<TextFieldProps, 'prefix' | 'keyboardType' | 'onChangeText'> & {
  onChangeText: (value: string) => void;
};

/**
 * Peruvian mobile: "+51" is fixed at the start and the person types the 9 digits, shown as
 * "987 654 321" while typing. The value is the national number; the form adds "+51" to send it.
 */
export const PhoneField = forwardRef<TextInput, PhoneFieldProps>(function PhoneField(
  { onChangeText, value, ...props },
  ref,
) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <TextField
      ref={ref}
      {...props}
      value={value ? formatPeruNational(value) : value}
      onChangeText={(text) => onChangeText(formatPeruNational(text))}
      keyboardType="number-pad"
      autoComplete="tel-national"
      textContentType="telephoneNumber"
      maxLength={11}
      prefix={
        <View
          style={[styles.prefix, { borderRightColor: theme.colors.border }]}
          accessible
          accessibilityLabel={t('phone.countryCode')}
        >
          <Text>{'🇵🇪'}</Text>
          <Text variant="bodyStrong">+51</Text>
        </View>
      }
    />
  );
});

const styles = StyleSheet.create({
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
