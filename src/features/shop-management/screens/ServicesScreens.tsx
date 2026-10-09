import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatMinutes, formatMoney } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import {
  Button,
  Chip,
  ConfirmDialog,
  IconTile,
  InfoCard,
  Notice,
  NumberStepper,
  QueryView,
  Screen,
  StatusPill,
  SwitchRow,
  Text,
  TextField,
  categoryIcon,
  useFieldErrorText,
} from '@/shared/ui';
import {
  DURATION_MAX,
  DURATION_MIN,
  DURATION_STEP,
  useServiceForm,
  useServicesList,
} from '../hooks/useServices';

export function ServicesScreen({
  shopId,
  onNew,
  onEdit,
}: {
  shopId: string;
  onNew: () => void;
  onEdit: (serviceId: string) => void;
}) {
  const { t } = useTranslation('shop');
  const services = useServicesList(shopId);
  return (
    <Screen>
      <Button label={t('services.new')} onPress={onNew} fullWidth />
      <QueryView
        query={services}
        skeletonCount={3}
        isEmpty={(list) => list.length === 0}
        empty={{ title: t('services.empty'), icon: 'cut-outline' }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((service) => (
              <InfoCard
                key={service.id}
                onPress={() => onEdit(service.id)}
                leading={<IconTile icon={categoryIcon(service.category.key)} />}
                title={service.name}
                subtitle={service.category.name}
                details={[
                  { icon: 'pricetag', text: formatMoney(service.price) },
                  { icon: 'time', text: formatMinutes(service.durationMinutes) },
                  { icon: 'people', text: t('services.barbersCount', { count: service.barberIds.length }) },
                ]}
                footer={
                  service.isAvailable ? (
                    <StatusPill tone="success" icon="checkmark-circle" label={t('services.available')} />
                  ) : (
                    <StatusPill tone="neutral" icon="eye-off" label={t('services.unavailable')} />
                  )
                }
              />
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

export function ServiceFormScreen({
  shopId,
  serviceId,
  onDone,
}: {
  shopId: string;
  serviceId?: string;
  onDone: () => void;
}) {
  const { t } = useTranslation('shop');
  const errorText = useFieldErrorText('shop');
  const f = useServiceForm(shopId, serviceId, { onDone });

  return (
    <Screen>
      <QueryView query={f.categories}>
        {(categories) => (
          <View style={styles.content}>
            {f.generalError ? <Notice tone="danger" message={f.generalError} /> : null}
            <Controller
              control={f.form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('services.form.name')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errorText(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={f.form.control}
              name="description"
              render={({ field }) => (
                <TextField
                  label={t('services.form.description')}
                  value={field.value}
                  onChangeText={field.onChange}
                  multiline
                />
              )}
            />
            <Controller
              control={f.form.control}
              name="categoryKey"
              render={({ field, fieldState }) => (
                <View style={styles.section}>
                  <Text variant="label" color="textSecondary">
                    {t('services.form.category')}
                  </Text>
                  <View style={styles.chips}>
                    {categories.map((category) => (
                      <Chip
                        key={category.key}
                        label={category.name}
                        selected={field.value === category.key}
                        onPress={() => field.onChange(category.key)}
                      />
                    ))}
                  </View>
                  {fieldState.error ? (
                    <Text variant="caption" color="danger">
                      {errorText(fieldState.error.message)}
                    </Text>
                  ) : null}
                </View>
              )}
            />
            <Controller
              control={f.form.control}
              name="price"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('services.form.price')}
                  placeholder={t('services.form.pricePlaceholder')}
                  hint={t('services.form.priceHint')}
                  keyboardType="decimal-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errorText(fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={f.form.control}
              name="durationMinutes"
              render={({ field }) => (
                <NumberStepper
                  label={t('services.form.duration')}
                  value={field.value}
                  onChange={field.onChange}
                  step={DURATION_STEP}
                  min={DURATION_MIN}
                  max={DURATION_MAX}
                  format={(minutes) => formatMinutes(minutes)}
                />
              )}
            />
            <Controller
              control={f.form.control}
              name="isAvailable"
              render={({ field }) => (
                <SwitchRow
                  title={t('services.form.available')}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <Button
              label={t('services.form.save')}
              onPress={() => void f.submit()}
              loading={f.isSaving}
              fullWidth
            />
            {f.editing ? (
              <Button label={t('services.form.delete')} variant="ghost" onPress={f.askDelete} />
            ) : null}
            <ConfirmDialog
              visible={f.confirmingDelete}
              title={t('services.form.deleteTitle')}
              message={f.deleteError ?? t('services.form.deleteMessage')}
              confirmLabel={t('services.form.deleteConfirm')}
              onConfirm={f.confirmDelete}
              onCancel={f.cancelDelete}
              loading={f.isDeleting}
              destructive
            />
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  list: { gap: spacing.md },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
