import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
  saveOwnerDocument,
  shopKeys,
  updateShop,
  type CreateShopBody,
  type ManagedShop,
} from '../api/shopApi';
import { DOCUMENT_LENGTH, documentDigits, ownerDocumentError } from '../schemas/ownerDocument';

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), { error: 'form.invalidUrl' });
const required = z.string().trim().min(1, { error: 'form.required' });

const schema = z
  .object({
    type: z.enum(['BARBERSHOP', 'INDEPENDENT']),
    name: required,
    description: z.string(),
    address: required,
    phone: required,
    /** Owner's document (ALTA.md): optional when creating; required later to send it to review. */
    documentType: z.enum(['RUC', 'DNI']),
    documentNumber: z.string(),
    websiteUrl: optionalUrl,
    instagramUrl: optionalUrl,
    facebookUrl: optionalUrl,
  })
  .superRefine((values, ctx) => {
    if (!values.documentNumber.trim()) return;
    const error = ownerDocumentError(values.documentType, values.documentNumber);
    if (error) ctx.addIssue({ code: 'custom', path: ['documentNumber'], message: error });
  });
export type ShopForm = z.infer<typeof schema>;

export type LocationState = 'idle' | 'locating' | 'denied' | 'error';

const FIELDS = [
  'name',
  'description',
  'address',
  'phone',
  'documentNumber',
  'websiteUrl',
  'instagramUrl',
  'facebookUrl',
] as const;

const documentOf = (values: ShopForm) =>
  values.documentNumber.trim()
    ? { type: values.documentType, number: documentDigits(values.documentNumber) }
    : null;

/** Shared fields of create and edit. The document is never sent as null: it is omitted. */
function toBody(values: ShopForm, coordinates: Coordinates, timezone: string): CreateShopBody {
  const orNull = (v: string) => (v.trim() ? v.trim() : null);
  return {
    name: values.name.trim(),
    description: orNull(values.description),
    address: values.address.trim(),
    phone: values.phone.trim(),
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
      documentType: 'RUC',
      documentNumber: '',
      websiteUrl: '',
      instagramUrl: '',
      facebookUrl: '',
    },
  });
  const documentType = useWatch({ control: form.control, name: 'documentType' });
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
      documentType: shop.ownerDocument?.type ?? 'RUC',
      documentNumber: '',
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
      const document = documentOf(values);
      if (shop) {
        await updateShop(shop.id, body);
        if (document) await saveOwnerDocument(shop.id, document);
        return shop.id;
      }
      const createBody = document ? { ...body, ownerDocument: document } : body;
      const created =
        values.type === 'INDEPENDENT'
          ? await createIndependent(createBody)
          : await createBarbershop(createBody);
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
      // The document is nested in the API (ownerDocument.number / ownerDocument.type).
      const documentError = fields['ownerDocument.number'] ?? fields['ownerDocument.type'];
      if (documentError) {
        form.setError(
          'documentNumber',
          { type: 'server', message: 'document.serverInvalid' },
          { shouldFocus: true },
        );
      }
      const others = Object.keys(fields).filter((f) => !f.startsWith('ownerDocument'));
      setGeneralError(
        documentError && others.length === 0 ? null : applyServerErrors(error, form.setError, FIELDS),
      );
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
    /** Only the main owner registers or changes the document (the API hides it from managers). */
    canEditDocument: !shop || shop.myRole === 'OWNER',
    currentDocument: shop?.ownerDocument ?? null,
    documentMaxLength: DOCUMENT_LENGTH[documentType],
    coordinates,
    locationState,
    useMyLocation: () => void useMyLocation(),
    submit,
    isSubmitting: mutation.isPending,
    generalError,
  };
}
