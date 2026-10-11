import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing } from '@/shared/theme';
import {
  Button,
  Card,
  Chip,
  InfoCard,
  Monogram,
  Notice,
  QueryView,
  Screen,
  StatusPill,
  SwitchRow,
  Text,
  TextField,
  useFieldErrorText,
} from '@/shared/ui';
import { useBarberForm, useBarbersList } from '../hooks/useBarbers';
import { useManagedShop } from '../hooks/useManagedShop';
import { LIMITS } from '../schemas/limits';

export function BarbersScreen({
  shopId,
  onNew,
  onRegisterMe,
  onEdit,
}: {
  shopId: string;
  onNew: () => void;
  onRegisterMe: () => void;
  onEdit: (barberId: string) => void;
}) {
  const { t } = useTranslation('shop');
  const barbers = useBarbersList(shopId);
  const shop = useManagedShop(shopId);
  return (
    <Screen>
      <Button label={t('barbers.new')} onPress={onNew} fullWidth />
      <Button label={t('barbers.registerMe')} variant="secondary" onPress={onRegisterMe} />
      {shop.data?.type === 'INDEPENDENT' ? (
        <Notice tone="info" message={t('barbers.independentLimit')} />
      ) : null}
      <QueryView
        query={barbers}
        skeletonCount={3}
        isEmpty={(list) => list.length === 0}
        empty={{ title: t('barbers.empty'), icon: 'people-outline' }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((barber) => (
              <InfoCard
                key={barber.id}
                onPress={() => onEdit(barber.id)}
                leading={<Monogram name={barber.displayName} size={sizes.avatarSmall} />}
                title={barber.displayName}
                subtitle={
                  barber.linkedUser
                    ? t('barbers.linked', { name: barber.linkedUser.fullName })
                    : t('barbers.notLinked')
                }
                details={[
                  { icon: 'cut', text: t('barbers.servicesCount', { count: barber.serviceIds.length }) },
                ]}
                footer={
                  barber.isActive ? (
                    <StatusPill tone="success" icon="checkmark-circle" label={t('barbers.active')} />
                  ) : (
                    <StatusPill tone="neutral" icon="pause-circle" label={t('barbers.inactive')} />
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

export function BarberFormScreen({
  shopId,
  barberId,
  self = false,
  onDone,
  onSchedule,
}: {
  shopId: string;
  barberId?: string;
  self?: boolean;
  onDone: () => void;
  onSchedule: (barberId: string) => void;
}) {
  const { t } = useTranslation('shop');
  const errorText = useFieldErrorText('shop');
  const f = useBarberForm(shopId, barberId, { self, onDone });

  return (
    <Screen>
      <QueryView query={f.services}>
        {(services) => (
          <View style={styles.content}>
            {f.generalError ? <Notice tone="danger" message={f.generalError} /> : null}
            <Controller
              control={f.form.control}
              name="displayName"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('barbers.form.displayName')}
                  maxLength={LIMITS.barberName.max}
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
              name="bio"
              render={({ field }) => (
                <TextField
                  label={t('barbers.form.bio')}
                  maxLength={LIMITS.bio.max}
                  value={field.value}
                  onChangeText={field.onChange}
                  multiline
                />
              )}
            />
            <Controller
              control={f.form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <TextField
                  label={t('barbers.form.phone')}
                  hint={t('barbers.form.phoneHint')}
                  keyboardType="phone-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errorText(fieldState.error?.message)}
                />
              )}
            />
            {f.editing ? (
              <Controller
                control={f.form.control}
                name="isActive"
                render={({ field }) => (
                  <SwitchRow
                    title={t('barbers.form.active')}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            ) : null}
            <Controller
              control={f.form.control}
              name="serviceIds"
              render={({ field }) => (
                <View style={styles.section}>
                  <Text variant="label" color="textSecondary">
                    {t('barbers.form.services')}
                  </Text>
                  <View style={styles.chips}>
                    {services.map((service) => {
                      const selected = field.value.includes(service.id);
                      return (
                        <Chip
                          key={service.id}
                          label={service.name}
                          selected={selected}
                          onPress={() =>
                            field.onChange(
                              selected
                                ? field.value.filter((id) => id !== service.id)
                                : [...field.value, service.id],
                            )
                          }
                        />
                      );
                    })}
                  </View>
                </View>
              )}
            />
            <Button
              label={t('barbers.form.save')}
              onPress={() => void f.submit()}
              loading={f.isSaving}
              fullWidth
            />
            {barberId ? (
              <Button
                label={t('barbers.form.schedule')}
                variant="secondary"
                onPress={() => onSchedule(barberId)}
              />
            ) : null}
            {f.canInvite ? (
              <Card>
                <Text variant="subtitle">{t('barbers.form.invite')}</Text>
                <Text variant="caption" color="textSecondary">
                  {t('barbers.form.inviteHint')}
                </Text>
                <TextField
                  label={t('barbers.form.inviteEmail')}
                  maxLength={LIMITS.email.max}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={f.inviteEmail}
                  onChangeText={f.setInviteEmail}
                />
                {f.invitedTo ? (
                  <Notice tone="success" message={t('barbers.form.inviteSent', { email: f.invitedTo })} />
                ) : null}
                {f.inviteError ? <Notice tone="danger" message={f.inviteError} /> : null}
                <Button
                  label={t('barbers.form.inviteSend')}
                  variant="secondary"
                  onPress={f.sendInvite}
                  loading={f.isInviting}
                  disabled={!f.inviteEmail.trim()}
                />
              </Card>
            ) : null}
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
