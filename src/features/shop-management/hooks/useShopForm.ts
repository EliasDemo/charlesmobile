import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fieldErrorsFrom, refreshSession } from '@/shared/api';
import { env } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import {
  getCurrentCoordinates,
  getLocationPermission,
  requestLocationPermission,
  type Coordinates,
} from '@/shared/lib';
import { applyServerErrors } from '@/shared/ui';
import {
  createBarbershop,
  createIndependent,
  shopKeys,
  updateShop,
  type CreateShopBody,
  type ManagedShop,
} from '../api/shopApi';

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), { error: 'form.invalidUrl' });
const required = z.string().trim().min(1, { error: 'form.required' });

const schema = z.object({
  type: z.enum(['BARBERSHOP', 'INDEPENDENT']),
  name: required,
  description: z.string(),
  address: required,
  phone: required,
  ruc: z.string().trim(),
  websiteUrl: optionalUrl,
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
});
export type ShopForm = z.infer<typeof schema>;

export type LocationState = 'idle' | 'locating' | 'denied' | 'error';

const FIELDS = [
  'name',
  'description',
  'address',
  'phone',
  'ruc',
  'websiteUrl',
  'instagramUrl',
  'facebookUrl',
] as const;

function toBody(values: ShopForm, coordinates: Coordinates, timezone: string): CreateShopBody {
  const orNull = (v: string) => (v.trim() ? v.trim() : null);
  return {
    name: values.name.trim(),
    description: orNull(values.description),
    address: values.address.trim(),
    phone: values.phone.trim(),
    ruc: orNull(values.ruc),
    websiteUrl: orNull(values.websiteUrl),
    instagramUrl: orNull(values.instagramUrl),
    facebookUrl: orNull(values.facebookUrl),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    timezone,
  };
}

/**
 * Create a barbershop (or independent profile) or edit one. The position is the phone's current
 * location, taken while at the shop (no geocoding service exists; a map pin comes with the Maps
 * build). After creating, the session is renewed so the new OWNER role is in the token.
 */
export function useShopForm({
  shop,
  onDone,
}: {
  /** Present when editing. */
  shop?: ManagedShop;
  onDone: (shopId: string) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<ShopForm>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      type: 'BARBERSHOP',
      name: '',
      description: '',
      address: '',
      phone: '',
      ruc: '',
      websiteUrl: '',
      instagramUrl: '',
      facebookUrl: '',
    },
  });
  // A new position taken with the phone; otherwise the saved one (when editing).
  const [picked, setPicked] = useState<Coordinates | null>(null);
  const coordinates = picked ?? (shop ? { latitude: shop.latitude, longitude: shop.longitude } : null);
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop) return;
    form.reset({
      type: shop.type,
      name: shop.name,
      description: shop.description ?? '',
      address: shop.address,
      phone: shop.phone ?? '',
      ruc: shop.ruc ?? '',
      websiteUrl: shop.links.website ?? '',
      instagramUrl: shop.links.instagram ?? '',
      facebookUrl: shop.links.facebook ?? '',
    });
  }, [shop, form]);

  const useMyLocation = async () => {
    setLocationState('locating');
    let permission = await getLocationPermission();
    if (permission !== 'granted' && permission !== 'blocked') permission = await requestLocationPermission();
    if (permission !== 'granted') return setLocationState('denied');
    try {
      setPicked(await getCurrentCoordinates());
      setLocationState('idle');
    } catch {
      setLocationState('error');
    }
  };

  const mutation = useMutation({
    mutationFn: async (values: ShopForm) => {
      const body = toBody(values, coordinates!, shop?.timezone ?? env.defaultTimeZone);
      if (shop) return (await updateShop(shop.id, body)).id;
      const created =
        values.type === 'INDEPENDENT' ? await createIndependent(body) : await createBarbershop(body);
      // New roles (OWNER, and BARBER for an independent) only appear in a renewed token.
      await refreshSession().catch(() => undefined);
      return created.id;
    },
    onSuccess: (shopId) => {
      void queryClient.invalidateQueries({ queryKey: shopKeys.all });
      onDone(shopId);
    },
    onError: (error) => {
      const fields = fieldErrorsFrom(error);
      if ('latitude' in fields || 'longitude' in fields) {
        setGeneralError(i18n.t('shop:form.locationOutside'));
        return;
      }
      setGeneralError(applyServerErrors(error, form.setError, FIELDS));
    },
  });

  const submit = form.handleSubmit((values) => {
    setGeneralError(null);
    if (!coordinates) return setGeneralError(i18n.t('shop:form.locationMissing'));
    mutation.mutate(values);
  });

  return {
    form,
    editing: Boolean(shop),
    coordinates,
    locationState,
    useMyLocation: () => void useMyLocation(),
    submit,
    isSubmitting: mutation.isPending,
    generalError,
  };
}
