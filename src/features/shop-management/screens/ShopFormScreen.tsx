import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import {
  Button,
  Card,
  Notice,
  QueryView,
  Screen,
  SegmentedControl,
  Text,
  TextField,
  useFieldErrorText,
  type TextFieldProps,
} from '@/shared/ui';
import type { ManagedShop } from '../api/shopApi';
import { useManagedShop } from '../hooks/useManagedShop';
import { useShopForm, type ShopForm } from '../hooks/useShopForm';

/** Create a barbershop or independent profile. */
export function CreateShopScreen({ onDone }: { onDone: (shopId: string) => void }) {
  return (
    <Screen>
      <ShopFormView onDone={onDone} />
    </Screen>
  );
}

/** Edit the details of a managed barbershop. */
export function EditShopScreen({ shopId, onDone }: { shopId: string; onDone: (shopId: string) => void }) {
  const shop = useManagedShop(shopId);
  return (
    <Screen>
      <QueryView query={shop}>{(data) => <ShopFormView shop={data} onDone={onDone} />}</QueryView>
    </Screen>
  );
}

function ShopFormView({ shop, onDone }: { shop?: ManagedShop; onDone: (shopId: string) => void }) {
  const { t } = useTranslation('shop');
  const errorText = useFieldErrorText('shop');
  const f = useShopForm({ shop, onDone });

  const field = (name: keyof ShopForm, label: string, props: Partial<TextFieldProps> = {}) => (
    <Controller
      control={f.form.control}
      name={name}
      render={({ field: c, fieldState }) => (
        <TextField
          label={label}
          value={String(c.value)}
          onChangeText={c.onChange}
          onBlur={c.onBlur}
          ref={c.ref}
          error={errorText(fieldState.error?.message)}
          {...props}
        />
      )}
    />
  );

  return (
    <View style={styles.content}>
      {f.editing ? null : (
        <>
          <Text variant="title">{t('form.createTitle')}</Text>
          <Controller
            control={f.form.control}
            name="type"
            render={({ field: c }) => (
              <SegmentedControl
                label={t('type.label')}
                value={c.value}
                onChange={c.onChange}
                options={[
                  { value: 'BARBERSHOP', label: t('type.BARBERSHOP') },
                  { value: 'INDEPENDENT', label: t('type.INDEPENDENT') },
                ]}
              />
            )}
          />
          {f.form.watch('type') === 'INDEPENDENT' ? (
            <Text variant="caption" color="textSecondary">
              {t('type.independentHint')}
            </Text>
          ) : null}
        </>
      )}
      {f.generalError ? <Notice tone="danger" message={f.generalError} /> : null}
      {field('name', t('form.name'), { autoCapitalize: 'words' })}
      {field('description', t('form.description'), { multiline: true })}
      {field('address', t('form.address'), { hint: t('form.addressHint'), autoComplete: 'street-address' })}
      <Card>
        <Text variant="subtitle">{t('form.location')}</Text>
        <Text variant="caption" color="textSecondary">
          {t('form.locationExplain')}
        </Text>
        {f.coordinates ? <Notice tone="success" message={t('form.locationSet')} /> : null}
        {f.locationState === 'denied' ? <Notice tone="warning" message={t('form.locationDenied')} /> : null}
        {f.locationState === 'error' ? (
          <Notice tone="warning" message={t('location.unavailable', { ns: 'search' })} />
        ) : null}
        <Button
          label={t('form.useMyLocation')}
          variant="secondary"
          onPress={f.useMyLocation}
          loading={f.locationState === 'locating'}
        />
      </Card>
      {field('phone', t('form.phone'), {
        keyboardType: 'phone-pad',
        placeholder: t('form.phonePlaceholder'),
      })}
      {field('ruc', t('form.ruc'), { keyboardType: 'number-pad' })}
      {field('websiteUrl', t('form.website'), {
        keyboardType: 'url',
        autoCapitalize: 'none',
        placeholder: t('form.urlPlaceholder'),
      })}
      {field('instagramUrl', t('form.instagram'), {
        keyboardType: 'url',
        autoCapitalize: 'none',
        placeholder: t('form.urlPlaceholder'),
      })}
      {field('facebookUrl', t('form.facebook'), {
        keyboardType: 'url',
        autoCapitalize: 'none',
        placeholder: t('form.urlPlaceholder'),
      })}
      <Button
        label={f.editing ? t('form.submitSave') : t('form.submitCreate')}
        onPress={() => void f.submit()}
        loading={f.isSubmitting}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
});
