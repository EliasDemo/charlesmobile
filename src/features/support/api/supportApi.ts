import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type TicketSummary = S['TicketSummaryDto'];
export type TicketDetail = S['TicketDetailDto'];
export type TicketPage = S['TicketPageDto'];
export type TicketCategory = S['CreateTicketDto']['category'];
export type CreateTicketBody = S['CreateTicketDto'];
export type ReportReason = S['CreateBarbershopReportDto']['reason'];

export const supportKeys = {
  all: ['support'] as const,
  list: (restricted: boolean) => ['support', 'list', restricted ? 'restricted' : 'session'] as const,
  ticket: (id: string) => ['support', 'ticket', id] as const,
};

/**
 * A disabled account only has a restricted token (memory only, 15 minutes) that works for these
 * endpoints. Without it, the normal session is used.
 */
const auth = (token?: string | null) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

const PAGE = 20;

export const fetchTickets = (token?: string | null, cursor?: string): Promise<TicketPage> =>
  unwrap(
    api.GET('/api/v1/me/support/tickets', {
      params: { query: { limit: PAGE, ...(cursor ? { cursor } : {}) } },
      ...auth(token),
    }),
  );

export const fetchTicket = (id: string, token?: string | null): Promise<TicketDetail> =>
  unwrap(api.GET('/api/v1/me/support/tickets/{id}', { params: { path: { id } }, ...auth(token) }));

export const createTicket = (body: CreateTicketBody, token?: string | null): Promise<TicketDetail> =>
  unwrap(api.POST('/api/v1/support/tickets', { body, ...auth(token) }));

export const replyTicket = (id: string, message: string, token?: string | null) =>
  unwrap(
    api.POST('/api/v1/me/support/tickets/{id}/messages', {
      params: { path: { id } },
      body: { body: message },
      ...auth(token),
    }),
  );

export const reportBarbershop = (barbershopId: string, reason: ReportReason, details: string) =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/reports', {
      params: { path: { id: barbershopId } },
      body: { reason, ...(details.trim() ? { details: details.trim() } : {}) },
    }),
  );
