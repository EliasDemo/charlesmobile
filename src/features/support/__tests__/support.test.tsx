import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/support.json';
import { NewTicketScreen, ReportBarbershopButton, SupportScreen, TicketScreen } from '..';

type S = components['schemas'];

const summary = (overrides: Partial<S['TicketSummaryDto']> = {}): S['TicketSummaryDto'] => ({
  id: 't1',
  category: 'BOOKING',
  subject: 'No me llegó la confirmación',
  status: 'OPEN',
  related: null,
  createdAt: '2030-01-07T15:00:00.000Z',
  updatedAt: '2030-01-07T15:00:00.000Z',
  resolvedAt: null,
  closedAt: null,
  ...overrides,
});

const detail = (overrides: Partial<S['TicketDetailDto']> = {}): S['TicketDetailDto'] => ({
  ...summary(),
  messages: [
    { id: 'm1', body: 'Pagué y sigue pendiente', from: 'USER', createdAt: '2030-01-07T15:00:00.000Z' },
    {
      id: 'm2',
      body: 'Lo revisamos y ya está confirmada',
      from: 'SUPPORT',
      createdAt: '2030-01-07T16:00:00.000Z',
    },
  ],
  canReply: true,
  ...overrides,
});

beforeEach(() => {
  resetAppState();
  signIn();
});

describe('SupportScreen', () => {
  it('lists my tickets with their state and opens one', async () => {
    mockApi({ 'GET /api/v1/me/support/tickets': { body: { items: [summary()], nextCursor: null } } });
    const onOpen = jest.fn();
    await renderWithProviders(<SupportScreen onNew={jest.fn()} onOpen={onOpen} />);
    expect(await screen.findByText('No me llegó la confirmación')).toBeTruthy();
    expect(screen.getByText(texts.status.OPEN)).toBeTruthy();
    await fireEvent.press(screen.getByText('No me llegó la confirmación'));
    expect(onOpen).toHaveBeenCalledWith('t1');
  });

  it('explains an empty list', async () => {
    mockApi({ 'GET /api/v1/me/support/tickets': { body: { items: [], nextCursor: null } } });
    await renderWithProviders(<SupportScreen onNew={jest.fn()} onOpen={jest.fn()} />);
    expect(await screen.findByText(texts.list.empty)).toBeTruthy();
  });

  it('uses the restricted token of a disabled account', async () => {
    resetAppState();
    const api = mockApi({ 'GET /api/v1/me/support/tickets': { body: { items: [], nextCursor: null } } });
    await renderWithProviders(
      <SupportScreen accessToken="restricted-1" onNew={jest.fn()} onOpen={jest.fn()} />,
    );
    await screen.findByText(texts.list.empty);
    expect(api.calls[0]?.headers.get('Authorization')).toBe('Bearer restricted-1');
  });
});

describe('NewTicketScreen', () => {
  it('validates the subject and sends the ticket linked to a booking', async () => {
    const api = mockApi({ 'POST /api/v1/support/tickets': { status: 201, body: detail({ id: 't9' }) } });
    const onCreated = jest.fn();
    await renderWithProviders(<NewTicketScreen bookingId="bk-1" onCreated={onCreated} />);
    expect(screen.getByText(texts.new.aboutBooking)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(texts.new.subject), 'ab');
    await fireEvent(screen.getByLabelText(texts.new.subject), 'blur');
    expect(await screen.findByText(texts.form.subjectShort)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(texts.new.subject), 'Cobro duplicado');
    await fireEvent.changeText(screen.getByLabelText(texts.new.message), 'Me cobraron dos veces');
    await fireEvent.press(screen.getByRole('button', { name: texts.new.send }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('t9'));
    expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({
      category: 'BOOKING',
      subject: 'Cobro duplicado',
      message: 'Me cobraron dos veces',
      relatedType: 'booking',
      relatedId: 'bk-1',
    });
  });
});

describe('TicketScreen', () => {
  it('shows the conversation and replies', async () => {
    const api = mockApi({
      'GET /api/v1/me/support/tickets/{id}': { body: detail() },
      'POST /api/v1/me/support/tickets/{id}/messages': { status: 201, body: detail() },
    });
    await renderWithProviders(<TicketScreen ticketId="t1" onNew={jest.fn()} />);
    expect(await screen.findByText('Lo revisamos y ya está confirmada')).toBeTruthy();
    const send = screen.getByRole('button', { name: texts.ticket.send });
    expect(send).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(texts.ticket.reply), 'Gracias');
    await fireEvent.press(send);
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ body: 'Gracias' }),
    );
  });

  it('offers a new ticket when it can no longer be answered', async () => {
    mockApi({
      'GET /api/v1/me/support/tickets/{id}': { body: detail({ status: 'CLOSED', canReply: false }) },
    });
    const onNew = jest.fn();
    await renderWithProviders(<TicketScreen ticketId="t1" onNew={onNew} />);
    expect(await screen.findByText(texts.ticket.closed)).toBeTruthy();
    expect(screen.queryByLabelText(texts.ticket.reply)).toBeNull();
  });
});

describe('ReportBarbershopButton', () => {
  it('needs a reason and explains when it was already reported', async () => {
    mockApi({ 'POST /api/v1/barbershops/{id}/reports': apiError(409, 'ALREADY_REPORTED') });
    await renderWithProviders(<ReportBarbershopButton barbershopId="s1" />);
    await fireEvent.press(screen.getByRole('button', { name: texts.report.action }));
    const send = screen.getByRole('button', { name: texts.report.send });
    expect(send).toBeDisabled();
    await fireEvent.press(screen.getByText(texts.report.reasons.NOT_OPERATING));
    await fireEvent.press(send);
    expect(await screen.findByText('Ya lo reportaste.')).toBeTruthy();
  });
});
