import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { refreshSession, translateError } from '@/shared/api';
import { formatPeruMobile, peruMobileDigits } from '@/shared/lib';
import { applyServerErrors } from '@/shared/ui';
import {
  createBarber,
  fetchManagedBarbers,
  fetchManagedServices,
  inviteBarber,
  linkSelfAsBarber,
  setBarberServices,
  shopKeys,
  updateBarber,
} from '../api/shopApi';

export function useBarbersList(shopId: string, enabled = true) {
  return useQuery({
    queryKey: shopKeys.barbers(shopId),
    queryFn: () => fetchManagedBarbers(shopId),
    enabled: enabled && shopId !== '',
  });
}

const schema = z.object({
  displayName: z.string().trim().min(1, { error: 'form.required' }),
  bio: z.string(),
  phone: z.string().refine((v) => v.trim() === '' || peruMobileDigits(v) !== null, {
    error: 'validation.phoneInvalid',
  }),
  isActive: z.boolean(),
  serviceIds: z.array(z.string()),
});
export type BarberForm = z.infer<typeof schema>;

/**
 * New barber profile, the owner registering as barber ("self"), or editing one. Services are
 * assigned with their own endpoint after saving.
 */
export function useBarberForm(
  shopId: string,
  barberId: string | undefined,
  { self = false, onDone }: { self?: boolean; onDone: () => void },
) {
  const queryClient = useQueryClient();
  const barbers = useBarbersList(shopId);
  const services = useQuery({
    queryKey: shopKeys.services(shopId),
    queryFn: () => fetchManagedServices(shopId),
  });
  const existing = barberId ? barbers.data?.find((b) => b.id === barberId) : undefined;
  const form = useForm<BarberForm>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { displayName: '', bio: '', phone: '', isActive: true, serviceIds: [] },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedTo, setInvitedTo] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    form.reset({
      displayName: existing.displayName,
      bio: existing.bio ?? '',
      phone: existing.phone ?? '',
      isActive: existing.isActive,
      serviceIds: existing.serviceIds,
    });
  }, [existing, form]);

  const save = useMutation({
    mutationFn: async (values: BarberForm) => {
      const digits = values.phone.trim() ? peruMobileDigits(values.phone) : null;
      const phone = digits ? formatPeruMobile(digits) : null;
      const common = { displayName: values.displayName.trim(), bio: values.bio.trim() || null, phone };
      if (barberId) {
        await updateBarber(shopId, barberId, { ...common, isActive: values.isActive });
        await setBarberServices(shopId, barberId, values.serviceIds);
        return;
      }
      const body = { ...common, serviceIds: values.serviceIds };
      if (self) {
        await linkSelfAsBarber(shopId, body);
        // The BARBER role only appears in a renewed token.
        await refreshSession().catch(() => undefined);
      } else {
        await createBarber(shopId, body);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopKeys.barbers(shopId) });
      void queryClient.invalidateQueries({ queryKey: shopKeys.services(shopId) });
      void queryClient.invalidateQueries({ queryKey: shopKeys.myBarber });
      onDone();
    },
    onError: (error) =>
      setGeneralError(applyServerErrors(error, form.setError, ['displayName', 'bio', 'phone', 'serviceIds'])),
  });

  const invite = useMutation({
    mutationFn: () => inviteBarber(shopId, barberId!, inviteEmail.trim()),
    onSuccess: () => {
      setInvitedTo(inviteEmail.trim());
      setInviteEmail('');
    },
  });

  return {
    form,
    editing: Boolean(barberId),
    existing,
    loading: Boolean(barberId) && !existing && barbers.isPending,
    services,
    submit: form.handleSubmit((values) => {
      setGeneralError(null);
      save.mutate(values);
    }),
    isSaving: save.isPending,
    generalError,
    canInvite: Boolean(existing && !existing.linkedUser),
    inviteEmail,
    setInviteEmail,
    sendInvite: () => {
      setInvitedTo(null);
      invite.mutate();
    },
    isInviting: invite.isPending,
    inviteError: invite.error ? translateError(invite.error).message : null,
    invitedTo,
  };
}
