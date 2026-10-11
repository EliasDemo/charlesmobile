import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { translateError } from '@/shared/api';
import { applyServerErrors } from '@/shared/ui';
import {
  createService,
  deleteService,
  fetchCategories,
  fetchManagedServices,
  shopKeys,
  updateService,
} from '../api/shopApi';
import { LIMITS } from '../schemas/limits';

/** Documented limits: 5 to 480 minutes, in multiples of 5. */
export const DURATION_MIN = 5;
export const DURATION_MAX = 480;
export const DURATION_STEP = 5;

/**
 * Price typed in soles ("25", "25.50" or "25,50") to céntimos, as the API expects. A unit
 * conversion of what the owner typed: no price is computed by the app.
 */
export function solesToCentimos(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, decimals = ''] = normalized.split('.') as [string, string?];
  const centimos = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  return centimos > 0 ? centimos : null;
}

export function centimosToSoles(amount: number): string {
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`;
}

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'form.required', abort: true })
    .min(LIMITS.serviceName.min, { error: 'form.min2' })
    .max(LIMITS.serviceName.max),
  description: z.string().max(LIMITS.serviceDescription.max),
  categoryKey: z.string().min(1, { error: 'services.form.chooseCategory' }),
  price: z.string().refine((v) => solesToCentimos(v) !== null, { error: 'services.form.invalidPrice' }),
  durationMinutes: z.number().min(DURATION_MIN).max(DURATION_MAX),
  isAvailable: z.boolean(),
});
export type ServiceForm = z.infer<typeof schema>;

export function useServicesList(shopId: string) {
  return useQuery({ queryKey: shopKeys.services(shopId), queryFn: () => fetchManagedServices(shopId) });
}

export function useServiceForm(
  shopId: string,
  serviceId: string | undefined,
  { onDone }: { onDone: () => void },
) {
  const queryClient = useQueryClient();
  const services = useServicesList(shopId);
  const categories = useQuery({
    queryKey: shopKeys.categories,
    queryFn: fetchCategories,
    staleTime: 60 * 60 * 1000,
  });
  const existing = serviceId ? services.data?.find((s) => s.id === serviceId) : undefined;
  const form = useForm<ServiceForm>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      description: '',
      categoryKey: '',
      price: '',
      durationMinutes: 30,
      isAvailable: true,
    },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!existing) return;
    form.reset({
      name: existing.name,
      description: existing.description ?? '',
      categoryKey: existing.category.key,
      price: centimosToSoles(existing.price.amount),
      durationMinutes: existing.durationMinutes,
      isAvailable: existing.isAvailable,
    });
  }, [existing, form]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: shopKeys.services(shopId) });

  const save = useMutation({
    mutationFn: (values: ServiceForm) => {
      const body = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        categoryKey: values.categoryKey,
        priceAmount: solesToCentimos(values.price)!,
        durationMinutes: values.durationMinutes,
        isAvailable: values.isAvailable,
      };
      return serviceId ? updateService(shopId, serviceId, body) : createService(shopId, body);
    },
    onSuccess: () => {
      void refresh();
      onDone();
    },
    onError: (error) =>
      setGeneralError(
        applyServerErrors(error, form.setError, ['name', 'description', 'categoryKey', 'durationMinutes']),
      ),
  });

  const remove = useMutation({
    mutationFn: () => deleteService(shopId, serviceId!),
    onSuccess: () => {
      void refresh();
      setConfirmingDelete(false);
      onDone();
    },
  });

  return {
    form,
    editing: Boolean(serviceId),
    loading: Boolean(serviceId) && !existing && services.isPending,
    services,
    categories,
    submit: form.handleSubmit((values) => {
      setGeneralError(null);
      save.mutate(values);
    }),
    isSaving: save.isPending,
    generalError,
    confirmingDelete,
    askDelete: () => setConfirmingDelete(true),
    cancelDelete: () => setConfirmingDelete(false),
    confirmDelete: () => remove.mutate(),
    isDeleting: remove.isPending,
    deleteError: remove.error ? translateError(remove.error).message : null,
  };
}
