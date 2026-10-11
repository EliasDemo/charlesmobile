import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { isApiError, nextPageParam, translateError } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { applyServerErrors, showToast } from '@/shared/ui';
import {
  createTicket,
  fetchTicket,
  fetchTickets,
  replyTicket,
  reportBarbershop,
  supportKeys,
  type ReportReason,
  type TicketCategory,
  type TicketPage,
} from '../api/supportApi';

/** Limits published in the contract (CreateTicketDto, TicketMessageInputDto, reports). */
export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 120;
export const MESSAGE_MAX = 2000;
export const REPORT_DETAILS_MAX = 500;

export const CATEGORIES: TicketCategory[] = [
  'BOOKING',
  'PAYMENT',
  'ACCOUNT',
  'BARBERSHOP',
  'REVIEW',
  'APP',
  'OTHER',
];
export const REPORT_REASONS: ReportReason[] = [
  'FRAUD',
  'MISLEADING_INFO',
  'INAPPROPRIATE',
  'NOT_OPERATING',
  'SAFETY',
  'OTHER',
];

/** My tickets, newest first. `token`: restricted access of a disabled account. */
export function useTickets(token?: string | null) {
  const query = useInfiniteQuery({
    queryKey: supportKeys.list(Boolean(token)),
    queryFn: ({ pageParam }) => fetchTickets(token, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: TicketPage) => nextPageParam(last),
    staleTime: 0,
  });
  return {
    items: query.data?.pages.flatMap((page) => page.items),
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefetching: query.isRefetching,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}

/** One ticket with its messages. Replying is allowed only when the API says so (`canReply`). */
export function useTicket(id: string, token?: string | null) {
  const queryClient = useQueryClient();
  const ticket = useQuery({
    queryKey: supportKeys.ticket(id),
    queryFn: () => fetchTicket(id, token),
    staleTime: 0,
  });
  const [message, setMessage] = useState('');
  const reply = useMutation({
    mutationFn: () => replyTicket(id, message.trim(), token),
    onSuccess: () => {
      setMessage('');
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: supportKeys.ticket(id) }),
  });
  const closed = isApiError(reply.error) && reply.error.code === 'TICKET_CLOSED';
  return {
    ticket,
    message,
    setMessage,
    canSend: message.trim().length > 0 && message.length <= MESSAGE_MAX,
    send: () => reply.mutate(),
    isSending: reply.isPending,
    /** The ticket was closed meanwhile: offer to open a new one. */
    closed,
    error: reply.error && !closed ? translateError(reply.error).message : null,
  };
}

const ticketSchema = z.object({
  category: z.enum(['ACCOUNT', 'BOOKING', 'PAYMENT', 'BARBERSHOP', 'REVIEW', 'APP', 'OTHER']),
  subject: z
    .string()
    .trim()
    .min(1, { error: 'form.required', abort: true })
    .min(SUBJECT_MIN, { error: 'form.subjectShort' })
    .max(SUBJECT_MAX),
  message: z.string().trim().min(1, { error: 'form.required' }).max(MESSAGE_MAX),
});
export type TicketForm = z.infer<typeof ticketSchema>;

/** New ticket, optionally about one of my bookings. */
export function useNewTicket({
  token,
  bookingId,
  onCreated,
}: {
  token?: string | null;
  bookingId?: string;
  onCreated: (ticketId: string) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    mode: 'onTouched',
    defaultValues: { category: bookingId ? 'BOOKING' : 'OTHER', subject: '', message: '' },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (values: TicketForm) =>
      createTicket(
        {
          category: values.category,
          subject: values.subject.trim(),
          message: values.message.trim(),
          ...(bookingId ? { relatedType: 'booking' as const, relatedId: bookingId } : {}),
        },
        token,
      ),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all });
      showToast(i18n.t('support:new.sent'));
      onCreated(ticket.id);
    },
    onError: (error) => setGeneralError(applyServerErrors(error, form.setError, ['subject', 'message'])),
  });
  return {
    form,
    submit: form.handleSubmit((values) => {
      setGeneralError(null);
      mutation.mutate(values);
    }),
    isSubmitting: mutation.isPending,
    generalError,
    aboutBooking: Boolean(bookingId),
  };
}

/** Report a barbershop (once per account): reason and optional details. */
export function useReportBarbershop(barbershopId: string) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const mutation = useMutation({
    mutationFn: () => reportBarbershop(barbershopId, reason!, details),
    onSuccess: () => {
      setOpen(false);
      showToast(i18n.t('support:report.sent'));
    },
  });
  return {
    open,
    ask: () => {
      setReason(null);
      setDetails('');
      mutation.reset();
      setOpen(true);
    },
    close: () => setOpen(false),
    reason,
    setReason,
    details,
    setDetails,
    canSend: reason !== null && details.length <= REPORT_DETAILS_MAX,
    send: () => mutation.mutate(),
    isSending: mutation.isPending,
    error: mutation.error ? translateError(mutation.error).message : null,
  };
}
