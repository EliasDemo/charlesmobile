import { useState } from 'react';
import { Controller, useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useServicesQuery } from '@/features/barbershop';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate } from '@/shared/lib';
import { spacing, type StatusTone } from '@/shared/theme';
import {
  ConfirmDialog,
  Button,
  Card,
  Chip,
  IconTile,
  InfoCard,
  ListRow,
  Notice,
  QueryView,
  Screen,
  SegmentedControl,
  StatusPill,
  SwitchRow,
  Text,
  TextField,
  useFieldErrorText,
  type IconName,
  type InfoItem,
  type TextFieldProps,
} from '@/shared/ui';
import type { Promotion, PromotionStatus } from '../api/promotionsApi';
import { promotionDaysText, promotionValueText } from '../components/PromotionParts';
import {
  useCreatePromotion,
  usePromotion,
  useShopPromotions,
  useShopTimeZone,
} from '../hooks/usePromotionManagement';

const STATUS: Record<PromotionStatus, { tone: StatusTone; icon: IconName }> = {
  ACTIVE: { tone: 'success', icon: 'checkmark-circle' },
  SCHEDULED: { tone: 'pending', icon: 'time' },
  PAUSED: { tone: 'neutral', icon: 'pause-circle' },
  ENDED: { tone: 'neutral', icon: 'flag' },
  EXHAUSTED: { tone: 'danger', icon: 'close-circle' },
};

export function PromotionStatusPill({ status }: { status: PromotionStatus }) {
  const { t } = useTranslation('promotions');
  return <StatusPill tone={STATUS[status].tone} icon={STATUS[status].icon} label={t(`status.${status}`)} />;
}

/** "Promociones" of the barbershop: every promotion with its state, uses and coupons. */
export function PromotionsScreen({
  shopId,
  onNew,
  onOpen,
}: {
  shopId: string;
  onNew: () => void;
  onOpen: (promotionId: string) => void;
}) {
  const { t } = useTranslation('promotions');
  const query = useShopPromotions(shopId);
  const timeZone = useShopTimeZone(shopId);
  return (
    <Screen>
      <Notice tone="info" message={t('assumedByShop')} />
      <Button label={t('new')} icon="add-circle" onPress={onNew} />
      <QueryView
        query={query}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('empty'), message: t('emptyMessage'), icon: 'pricetag-outline' }}
        skeletonCount={2}
      >
        {(items) => (
          <View style={styles.list}>
            {items.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                timeZone={timeZone}
                onPress={() => onOpen(promotion.id)}
              />
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

function PromotionCard({
  promotion,
  timeZone,
  onPress,
}: {
  promotion: Promotion;
  timeZone: string;
  onPress: () => void;
}) {
  const { t } = useTranslation('promotions');
  const details: InfoItem[] = [
    { icon: 'calendar', text: promotionDaysText(promotion.daysOfWeek) },
    {
      icon: 'people',
      text:
        promotion.maxRedemptions !== null
          ? t('redemptionsOf', { count: promotion.redemptions, max: promotion.maxRedemptions })
          : t('redemptions', { count: promotion.redemptions }),
    },
    { icon: 'cash', text: t('discounted', { amount: formatMoney(promotion.discountedTotal) }) },
  ];
  if (promotion.endsAt) {
    details.push({ icon: 'time', text: t('endsAt', { date: formatShortDate(promotion.endsAt, timeZone) }) });
  }
  if (promotion.requiresCoupon) {
    details.push({ icon: 'ticket', text: t('couponsCount', { count: promotion.coupons.length }) });
  }
  return (
    <InfoCard
      testID={`promotion-${promotion.id}`}
      onPress={onPress}
      leading={<IconTile icon="pricetag" />}
      title={promotion.name}
      subtitle={promotionValueText(promotion)}
      details={details}
      footer={<PromotionStatusPill status={promotion.status} />}
    />
  );
}

/** A text field bound to a form field, with its error next to it. */
function FormField<T extends FieldValues>({
  control,
  name,
  ...props
}: { control: Control<T>; name: Path<T> } & Omit<TextFieldProps, 'value' | 'onChangeText'>) {
  const errorText = useFieldErrorText('promotions');
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          value={field.value as string}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
          error={errorText(fieldState.error?.message)}
        />
      )}
    />
  );
}

const DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

/** New promotion: kind and value can't change later ("crea otra"), so they are only asked here. */
export function NewPromotionScreen({
  shopId,
  onCreated,
}: {
  shopId: string;
  onCreated: (promotionId: string) => void;
}) {
  const { t } = useTranslation('promotions');
  const { t: tc } = useTranslation();
  const services = useServicesQuery(shopId);
  const f = useCreatePromotion({ shopId, onCreated: (p) => onCreated(p.id) });
  const type = useWatch({ control: f.form.control, name: 'type' });
  const daysShort = tc('daysShort', { returnObjects: true }) as string[];
  return (
    <Screen>
      {f.generalError ? <Notice tone="danger" message={f.generalError} /> : null}
      <FormField control={f.form.control} name="name" label={t('form.name')} maxLength={80} />
      <Controller
        control={f.form.control}
        name="type"
        render={({ field }) => (
          <SegmentedControl
            label={t('form.type')}
            options={[
              { value: 'PERCENTAGE', label: t('form.percentage') },
              { value: 'FIXED_AMOUNT', label: t('form.fixed') },
            ]}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <FormField
        control={f.form.control}
        name="value"
        label={type === 'PERCENTAGE' ? t('form.percentValue') : t('form.amountValue')}
        hint={type === 'PERCENTAGE' ? t('form.percentHint') : t('form.amountHint')}
        keyboardType="decimal-pad"
        maxLength={6}
      />
      <Controller
        control={f.form.control}
        name="serviceId"
        render={({ field }) => (
          <View style={styles.group}>
            <Text variant="label" color="textSecondary">
              {t('form.service')}
            </Text>
            <View style={styles.chips}>
              <Chip
                label={t('form.allServices')}
                selected={!field.value}
                onPress={() => field.onChange('')}
              />
              {(services.data ?? []).map((service) => (
                <Chip
                  key={service.id}
                  label={service.name}
                  selected={field.value === service.id}
                  onPress={() => field.onChange(service.id)}
                />
              ))}
            </View>
          </View>
        )}
      />
      <Controller
        control={f.form.control}
        name="daysOfWeek"
        render={({ field }) => (
          <View style={styles.group}>
            <Text variant="label" color="textSecondary">
              {t('form.days')}
            </Text>
            <View style={styles.chips}>
              {DAYS.map((day) => {
                const selected = field.value.includes(day);
                return (
                  <Chip
                    key={day}
                    label={daysShort[day] ?? ''}
                    selected={selected}
                    onPress={() =>
                      field.onChange(
                        selected ? field.value.filter((d: number) => d !== day) : [...field.value, day],
                      )
                    }
                  />
                );
              })}
            </View>
            <Text variant="caption" color="textSecondary">
              {t('form.daysHint')}
            </Text>
          </View>
        )}
      />
      <FormField
        control={f.form.control}
        name="startsAt"
        label={t('form.startsAt')}
        placeholder={t('form.datePlaceholder')}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      <FormField
        control={f.form.control}
        name="endsAt"
        label={t('form.endsAt')}
        placeholder={t('form.datePlaceholder')}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      <FormField
        control={f.form.control}
        name="maxRedemptions"
        label={t('form.maxRedemptions')}
        keyboardType="number-pad"
        maxLength={6}
      />
      <FormField
        control={f.form.control}
        name="maxPerUser"
        label={t('form.maxPerUser')}
        keyboardType="number-pad"
        maxLength={4}
      />
      <Controller
        control={f.form.control}
        name="requiresCoupon"
        render={({ field }) => (
          <SwitchRow
            title={t('form.requiresCoupon')}
            subtitle={t('form.requiresCouponHint')}
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
      />
      <Notice tone="info" message={t('assumedByShop')} />
      <Button label={t('form.create')} onPress={() => void f.submit()} loading={f.isSubmitting} fullWidth />
    </Screen>
  );
}

/** One promotion: name, end and caps can change; pause or resume; coupons when it needs one. */
export function PromotionScreen({ shopId, promotionId }: { shopId: string; promotionId: string }) {
  const { t } = useTranslation('promotions');
  const p = usePromotion({ shopId, promotionId });
  return (
    <Screen>
      <QueryView
        query={p.list}
        isEmpty={() => !p.promotion}
        empty={{ title: t('notFound'), icon: 'pricetag-outline' }}
      >
        {() => {
          const promotion = p.promotion!;
          const paused = promotion.status === 'PAUSED';
          return (
            <View style={styles.list}>
              <Card>
                <Text variant="title">{promotionValueText(promotion)}</Text>
                <Text color="textSecondary">{promotionDaysText(promotion.daysOfWeek)}</Text>
                <PromotionStatusPill status={promotion.status} />
                <Text variant="caption" color="textSecondary">
                  {t('fixedKind')}
                </Text>
              </Card>
              {p.generalError ? <Notice tone="danger" message={p.generalError} /> : null}
              {promotion.status !== 'ENDED' ? (
                <Button
                  label={paused ? t('resume') : t('pause')}
                  icon={paused ? 'play' : 'pause'}
                  variant="secondary"
                  onPress={() => p.setActive(paused)}
                  loading={p.isToggling}
                />
              ) : null}
              <FormField control={p.form.control} name="name" label={t('form.name')} maxLength={80} />
              <FormField
                control={p.form.control}
                name="endsAt"
                label={t('form.endsAt')}
                placeholder={t('form.datePlaceholder')}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
              <FormField
                control={p.form.control}
                name="maxRedemptions"
                label={t('form.maxRedemptions')}
                keyboardType="number-pad"
                maxLength={6}
              />
              <FormField
                control={p.form.control}
                name="maxPerUser"
                label={t('form.maxPerUser')}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Button label={t('form.save')} onPress={() => void p.save()} loading={p.isSaving} fullWidth />
              {promotion.requiresCoupon ? (
                <Card>
                  <Text variant="subtitle">{t('coupons.title')}</Text>
                  {promotion.coupons.length === 0 ? (
                    <Text color="textSecondary">{t('coupons.empty')}</Text>
                  ) : null}
                  {promotion.coupons.map((coupon) => (
                    <CouponRow
                      key={coupon.id}
                      code={coupon.code}
                      uses={t('coupons.uses', { count: coupon.redemptions })}
                      onRemove={() => p.removeCoupon(coupon.id)}
                    />
                  ))}
                  <Text variant="caption" color="textSecondary">
                    {t('coupons.removeHint')}
                  </Text>
                  <TextField
                    label={t('coupons.code')}
                    hint={t('coupons.codeHint')}
                    value={p.couponCode}
                    onChangeText={p.setCouponCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={20}
                    error={p.couponError ?? undefined}
                  />
                  <Button
                    label={t('coupons.add')}
                    variant="secondary"
                    icon="add"
                    onPress={p.addCoupon}
                    loading={p.isAddingCoupon}
                  />
                </Card>
              ) : null}
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

/** A coupon of the promotion; removing it asks first (people may already have it). */
function CouponRow({ code, uses, onRemove }: { code: string; uses: string; onRemove: () => void }) {
  const { t } = useTranslation('promotions');
  const [asking, setAsking] = useState(false);
  return (
    <>
      <ListRow icon="ticket" title={code} value={uses} onPress={() => setAsking(true)} destructive />
      <ConfirmDialog
        visible={asking}
        title={t('coupons.removeTitle', { code })}
        message={t('coupons.removeMessage')}
        confirmLabel={t('coupons.remove')}
        destructive
        onConfirm={() => {
          setAsking(false);
          onRemove();
        }}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
