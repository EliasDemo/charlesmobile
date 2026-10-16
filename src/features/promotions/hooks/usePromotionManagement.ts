import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBarbershopQuery } from '@/features/barbershop';
import { isApiError } from '@/shared/api';
import { env } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import { dmyToIsoDate, isoDateToDmy, toLocalDate, zonedTimeToIso } from '@/shared/lib';
import { applyServerErrors, showToast, translateErrorMessage } from '@/shared/ui';
import {
  addCoupon,
  createPromotion,
  fetchShopPromotions,
  promotionKeys,
  removeCoupon,
  updatePromotion,
  type CreatePromotionBody,
  type Promotion,
} from '../api/promotionsApi';
import {
  couponCodeOk,
  promotionEditSchema,
  promotionSchema,
  solesToCents,
  type PromotionEditForm,
  type PromotionForm,
} from '../schemas/promotionSchemas';

/** A day typed as DD/MM/YYYY → that moment in the barbershop's zone (start or end of the day). */
const dayToIso = (value: string, time: '00:00' | '23:59', timeZone: string) => {
  const date = dmyToIsoDate(value);
  return date ? zonedTimeToIso(date, time, timeZone) : undefined;
};
const countOrNull = (value: string) => (value.trim() ? Number(value.trim()) : null);

/** Dates of a promotion are days in the barbershop's zone (Lima while it is not public yet). */
export function useShopTimeZone(shopId: string): string {
  return useBarbershopQuery(shopId).data?.timezone ?? env.defaultTimeZone;
}

export function useShopPromotions(shopId: string) {
  return useQuery({
    queryKey: promotionKeys.managed(shopId),
    queryFn: () => fetchShopPromotions(shopId),
    staleTime: 0,
  });
}

function useRefresh(shopId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: promotionKeys.managed(shopId) });
    void queryClient.invalidateQueries({ queryKey: promotionKeys.active(shopId) });
  };
}

export function useCreatePromotion({
  shopId,
  onCreated,
}: {
  shopId: string;
  onCreated: (promotion: Promotion) => void;
}) {
  const timeZone = useShopTimeZone(shopId);
  const refresh = useRefresh(shopId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<PromotionForm>({
    resolver: zodResolver(promotionSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      type: 'PERCENTAGE',
      value: '',
      serviceId: '',
      startsAt: '',
      endsAt: '',
      maxRedemptions: '',
      maxPerUser: '',
      daysOfWeek: [],
      requiresCoupon: false,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: PromotionForm) => {
      const body: CreatePromotionBody = {
        name: values.name.trim(),
        type: values.type,
        value: values.type === 'PERCENTAGE' ? Number(values.value.trim()) : solesToCents(values.value),
        requiresCoupon: values.requiresCoupon,
      };
      if (values.serviceId) body.serviceId = values.serviceId;
      if (values.daysOfWeek.length) body.daysOfWeek = values.daysOfWeek;
      const startsAt = dayToIso(values.startsAt, '00:00', timeZone);
      const endsAt = dayToIso(values.endsAt, '23:59', timeZone);
      if (startsAt) body.startsAt = startsAt;
      if (endsAt) body.endsAt = endsAt;
      if (values.maxRedemptions.trim()) body.maxRedemptions = Number(values.maxRedemptions);
      if (values.maxPerUser.trim()) body.maxPerUser = Number(values.maxPerUser);
      return createPromotion(shopId, body);
    },
    onSuccess: (promotion) => {
      refresh();
      showToast(i18n.t('promotions:created'));
      onCreated(promotion);
    },
    onError: (error) =>
      setGeneralError(
        applyServerErrors(error, form.setError, [
          'name',
          'value',
          'startsAt',
          'endsAt',
          'maxRedemptions',
          'maxPerUser',
        ]),
      ),
  });
  return {
    form,
    submit: form.handleSubmit((values) => {
      setGeneralError(null);
      mutation.mutate(values);
    }),
    isSubmitting: mutation.isPending,
    generalError,
  };
}

/** One promotion: edit what can change, pause or resume it, and manage its coupons. */
export function usePromotion({ shopId, promotionId }: { shopId: string; promotionId: string }) {
  const timeZone = useShopTimeZone(shopId);
  const list = useShopPromotions(shopId);
  const promotion = list.data?.find((p) => p.id === promotionId);
  const refresh = useRefresh(shopId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const form = useForm<PromotionEditForm>({
    resolver: zodResolver(promotionEditSchema),
    mode: 'onTouched',
    defaultValues: { name: '', endsAt: '', maxRedemptions: '', maxPerUser: '' },
  });
  useEffect(() => {
    if (!promotion) return;
    form.reset({
      name: promotion.name,
      endsAt: promotion.endsAt ? isoDateToDmy(toLocalDate(promotion.endsAt, timeZone)) : '',
      maxRedemptions: promotion.maxRedemptions?.toString() ?? '',
      maxPerUser: promotion.maxPerUser?.toString() ?? '',
    });
    // Only when another promotion is loaded, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotion?.id]);

  const save = useMutation({
    mutationFn: (values: PromotionEditForm) =>
      updatePromotion(shopId, promotionId, {
        name: values.name.trim(),
        endsAt: dayToIso(values.endsAt, '23:59', timeZone) ?? null,
        maxRedemptions: countOrNull(values.maxRedemptions),
        maxPerUser: countOrNull(values.maxPerUser),
      }),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('promotions:saved'));
    },
    onError: (error) =>
      setGeneralError(
        applyServerErrors(error, form.setError, ['name', 'endsAt', 'maxRedemptions', 'maxPerUser']),
      ),
  });
  const toggle = useMutation({
    mutationFn: (isActive: boolean) => updatePromotion(shopId, promotionId, { isActive }),
    onSuccess: refresh,
    onError: (error) => setGeneralError(translateErrorMessage(error)),
  });
  const add = useMutation({
    mutationFn: (code: string) => addCoupon(shopId, promotionId, code),
    onSuccess: () => {
      setCouponCode('');
      refresh();
    },
    onError: (error) =>
      setCouponError(
        isApiError(error) && error.code === 'COUPON_CODE_TAKEN'
          ? i18n.t('promotions:coupons.taken')
          : translateErrorMessage(error),
      ),
  });
  const remove = useMutation({
    mutationFn: (couponId: string) => removeCoupon(shopId, promotionId, couponId),
    onSuccess: refresh,
    onError: (error) => setCouponError(translateErrorMessage(error)),
  });

  return {
    list,
    promotion,
    form,
    save: form.handleSubmit((values) => {
      setGeneralError(null);
      save.mutate(values);
    }),
    isSaving: save.isPending,
    generalError,
    /** Pausing is `isActive: false`; resuming, `true`. */
    setActive: (active: boolean) => toggle.mutate(active),
    isToggling: toggle.isPending,
    couponCode,
    setCouponCode: (value: string) => {
      setCouponCode(value);
      setCouponError(null);
    },
    addCoupon: () => {
      if (!couponCodeOk(couponCode)) {
        setCouponError(i18n.t('promotions:coupons.invalid'));
        return;
      }
      add.mutate(couponCode.trim());
    },
    isAddingCoupon: add.isPending,
    removeCoupon: (couponId: string) => remove.mutate(couponId),
    couponError,
  };
}
