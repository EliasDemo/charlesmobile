import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError, nextPageParam } from '@/shared/api';
import { env } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import { dmyToIsoDate, isoDateToDmy, toLocalDate, zonedTimeToIso } from '@/shared/lib';
import { applyServerErrors, showToast, translateErrorMessage } from '@/shared/ui';
import {
  applyToJob,
  createJob,
  decideApplication,
  fetchApplicants,
  fetchJob,
  fetchJobs,
  fetchMyApplications,
  fetchShopJobs,
  inviteBarberProfile,
  jobKeys,
  updateJob,
  withdrawApplication,
  type Decision,
  type EmploymentType,
  type JobFilters,
  type JobPosting,
  type JobPostingPage,
} from '../api/jobsApi';
import { jobSchema, type JobForm } from '../schemas/jobSchemas';

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'WEEKENDS',
  'COMMISSION',
  'FREELANCE',
];

export function useJobList(filters: JobFilters) {
  const query = useInfiniteQuery({
    queryKey: jobKeys.list(filters),
    queryFn: ({ pageParam }) => fetchJobs(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: JobPostingPage) => nextPageParam(last),
  });
  return {
    items: query.data?.pages.flatMap((p) => p.items),
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

/** A posting and applying to it (with an optional message). */
export function useJob(id: string, { onRequireProfile }: { onRequireProfile: () => void }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: jobKeys.detail(id), queryFn: () => fetchJob(id) });
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const apply = useMutation({
    mutationFn: () => applyToJob(id, message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      showToast(i18n.t('jobs:applied'));
    },
    onError: (err) => {
      // No professional profile yet: the backend answers 403.
      if (isApiError(err) && err.status === 403) return onRequireProfile();
      if (isApiError(err) && (err.code === 'ALREADY_APPLIED' || err.code === 'JOB_POSTING_CLOSED')) {
        void query.refetch();
      }
      setError(translateErrorMessage(err));
    },
  });
  return {
    query,
    message,
    setMessage,
    apply: () => {
      setError(null);
      apply.mutate();
    },
    isApplying: apply.isPending,
    error,
  };
}

export function useMyApplications() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: jobKeys.mine, queryFn: fetchMyApplications, staleTime: 0 });
  const withdraw = useMutation({
    mutationFn: withdrawApplication,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: jobKeys.all }),
  });
  return {
    query,
    withdraw: (id: string) => withdraw.mutate(id),
    isWithdrawing: withdraw.isPending,
    error: withdraw.error ? translateErrorMessage(withdraw.error) : null,
  };
}

export function useShopJobs(shopId: string) {
  return useQuery({ queryKey: jobKeys.shop(shopId), queryFn: () => fetchShopJobs(shopId), staleTime: 0 });
}

/** Create or edit a posting; editing also closes or reopens it. */
export function useJobForm({
  shopId,
  jobId,
  onSaved,
}: {
  shopId: string;
  jobId?: string;
  onSaved: (job: JobPosting) => void;
}) {
  const queryClient = useQueryClient();
  const list = useShopJobs(shopId);
  const job = jobId ? list.data?.find((j) => j.id === jobId) : undefined;
  const [generalError, setGeneralError] = useState<string | null>(null);
  const zone = env.defaultTimeZone;
  const form = useForm<JobForm>({
    resolver: zodResolver(jobSchema),
    mode: 'onTouched',
    defaultValues: {
      title: '',
      description: '',
      employmentType: 'FULL_TIME',
      compensationText: '',
      styleIds: [],
      closesAt: '',
    },
  });
  useEffect(() => {
    if (!job) return;
    form.reset({
      title: job.title,
      description: job.description,
      employmentType: job.employmentType,
      compensationText: job.compensationText ?? '',
      styleIds: job.styles.map((s) => s.id),
      closesAt: job.closesAt ? isoDateToDmy(toLocalDate(job.closesAt, zone)) : '',
    });
    // Only when another posting is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: jobKeys.all });

  const save = useMutation({
    mutationFn: (values: JobForm) => {
      const date = dmyToIsoDate(values.closesAt);
      const closesAt = date ? zonedTimeToIso(date, '23:59', zone) : undefined;
      const base = {
        title: values.title.trim(),
        description: values.description.trim(),
        employmentType: values.employmentType,
        styleIds: values.styleIds,
      };
      return jobId
        ? updateJob(shopId, jobId, {
            ...base,
            compensationText: values.compensationText.trim() || null,
            closesAt: closesAt ?? null,
          })
        : createJob(shopId, {
            ...base,
            ...(values.compensationText.trim() ? { compensationText: values.compensationText.trim() } : {}),
            ...(closesAt ? { closesAt } : {}),
          });
    },
    onSuccess: (saved) => {
      refresh();
      showToast(i18n.t(jobId ? 'jobs:shop.saved' : 'jobs:shop.created'));
      onSaved(saved);
    },
    onError: (error) =>
      setGeneralError(
        applyServerErrors(error, form.setError, ['title', 'description', 'compensationText', 'closesAt']),
      ),
  });
  const toggle = useMutation({
    mutationFn: (status: 'OPEN' | 'CLOSED') => updateJob(shopId, jobId!, { status }),
    onSuccess: refresh,
    onError: (error) => setGeneralError(translateErrorMessage(error)),
  });
  return {
    list,
    job,
    editing: Boolean(jobId),
    form,
    submit: form.handleSubmit((values) => {
      setGeneralError(null);
      save.mutate(values);
    }),
    isSubmitting: save.isPending,
    setStatus: (status: 'OPEN' | 'CLOSED') => toggle.mutate(status),
    isToggling: toggle.isPending,
    generalError,
  };
}

/** Applicants of a posting and the barbershop's decision on each. */
export function useApplicants(shopId: string, jobId: string, { onHired }: { onHired: () => void }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: jobKeys.applicants(shopId, jobId),
    queryFn: () => fetchApplicants(shopId, jobId),
    staleTime: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Decision }) => decideApplication(shopId, id, status),
    onSuccess: (_r, { status }) => {
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      if (status === 'HIRED') {
        // The barber joins the team without services: the barbershop assigns them next.
        void queryClient.invalidateQueries({ queryKey: ['shop-management'] });
        showToast(i18n.t('jobs:shop.hired'));
        onHired();
      }
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    query,
    decide: (id: string, status: Decision) => {
      setError(null);
      decide.mutate({ id, status });
    },
    deciding: decide.isPending ? decide.variables : undefined,
    error,
  };
}

/** "Invitar a mi barbería" from a barber's profile or the search of available barbers. */
export function useInviteBarber(shopId: string | null) {
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({ profileId, message }: { profileId: string; message?: string }) =>
      inviteBarberProfile(shopId!, profileId, message),
    onSuccess: (_r, { profileId }) => {
      setInvited((list) => [...list, profileId]);
      showToast(i18n.t('jobs:invite.sent'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    available: Boolean(shopId),
    invite: (profileId: string, message?: string) => {
      setError(null);
      mutation.mutate({ profileId, message });
    },
    isInviting: (profileId: string) => mutation.isPending && mutation.variables?.profileId === profileId,
    wasInvited: (profileId: string) => invited.includes(profileId),
    error,
  };
}

/** Has this account applied to any job (a step of "Destaca tu perfil")? undefined while loading. */
export function useHasApplied(enabled = true) {
  const query = useQuery({ queryKey: jobKeys.mine, queryFn: fetchMyApplications, enabled });
  return query.data === undefined ? undefined : query.data.length > 0;
}
