import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi, page } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/messages.json';
import { ChatScreen, ConversationsScreen, ME, NewConversationScreen } from '..';

type S = components['schemas'];

const conversation = (overrides: Partial<S['ConversationDto']> = {}): S['ConversationDto'] => ({
  id: 'c1',
  kind: 'CLIENT',
  counterpart: { id: 'shop-1', name: 'Barbería Demo', photoUrl: null, barberProfileId: null },
  lastMessagePreview: '¿Tienen turno el sábado?',
  lastMessageAt: '2030-01-07T15:00:00.000Z',
  unread: 2,
  blocked: false,
  blockedByMe: false,
  ...overrides,
});

const message = (overrides: Partial<S['MessageDto']> = {}): S['MessageDto'] => ({
  id: 'm1',
  side: 'BARBERSHOP',
  mine: false,
  senderName: 'Barbería Demo',
  body: 'Sí, a las 10',
  removed: false,
  createdAt: '2030-01-07T15:00:00.000Z',
  ...overrides,
});

const messages = (items: S['MessageDto'][], conv = conversation()) => ({
  conversation: conv,
  items,
  nextCursor: null,
});

beforeEach(() => {
  resetAppState();
  signIn();
});

describe('ConversationsScreen', () => {
  it('lists conversations with their unread messages', async () => {
    mockApi({ 'GET /api/v1/me/conversations': { body: page([conversation()]) } });
    const onOpen = jest.fn();
    await renderWithProviders(<ConversationsScreen mailbox={ME} onOpen={onOpen} />);
    expect(await screen.findByText('Barbería Demo')).toBeTruthy();
    expect(screen.getByText('2 nuevos')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('conversation-c1'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('explains how to start when there are none', async () => {
    mockApi({ 'GET /api/v1/me/conversations': { body: page([]) } });
    await renderWithProviders(<ConversationsScreen mailbox={ME} onOpen={jest.fn()} />);
    expect(await screen.findByText(texts.empty)).toBeTruthy();
  });
});

describe('ChatScreen', () => {
  it('shows people and Charles differently, and sends a message', async () => {
    const api = mockApi({
      'GET /api/v1/me/conversations/{id}/messages': {
        body: messages([
          message(),
          message({ id: 'm0', side: 'SYSTEM', senderName: null, body: 'Postulación recibida' }),
        ]),
      },
      'POST /api/v1/me/conversations/{id}/messages': { status: 201, body: message({ id: 'm2', mine: true }) },
    });
    await renderWithProviders(<ChatScreen mailbox={ME} conversationId="c1" />);
    expect(await screen.findByText('Sí, a las 10')).toBeTruthy();
    expect(screen.getByText(texts.chat.charles)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('chat-input'), '  Perfecto, gracias  ');
    await fireEvent.press(screen.getByRole('button', { name: texts.chat.send }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({ body: 'Perfecto, gracias' }),
    );
  });

  it('cannot write in a blocked conversation', async () => {
    mockApi({
      'GET /api/v1/me/conversations/{id}/messages': {
        body: messages([message()], conversation({ blocked: true, blockedByMe: false })),
      },
    });
    await renderWithProviders(<ChatScreen mailbox={ME} conversationId="c1" />);
    expect(await screen.findByText(texts.chat.blockedByThem)).toBeTruthy();
    expect(screen.getByRole('button', { name: texts.chat.send })).toBeDisabled();
    // Only who blocked can unblock.
    expect(screen.queryByRole('button', { name: texts.chat.unblock })).toBeNull();
  });

  it('reports a received message with a reason', async () => {
    const api = mockApi({
      'GET /api/v1/me/conversations/{id}/messages': { body: messages([message()]) },
      'POST /api/v1/messages/{id}/report': apiError(409, 'ALREADY_REPORTED'),
    });
    await renderWithProviders(<ChatScreen mailbox={ME} conversationId="c1" />);
    await fireEvent(await screen.findByTestId('message-m1'), 'longPress');
    await fireEvent.press(screen.getByText(texts.report.reasons.SCAM));
    await fireEvent.press(screen.getByRole('button', { name: texts.report.send }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.path === '/api/v1/messages/m1/report')!.body).toEqual({
        reason: 'SCAM',
      }),
    );
    expect(await screen.findByText(texts.report.already)).toBeTruthy();
  });

  it('finds the barbershop side of a conversation opened from a notice', async () => {
    mockApi({
      'GET /api/v1/me/conversations/{id}/messages': apiError(404, 'NOT_FOUND'),
      'GET /api/v1/me/barbershops': {
        body: page([{ id: 'shop-1', name: 'Mía', type: 'SHOP', status: 'OPEN', myRole: 'OWNER' }]),
      },
      'GET /api/v1/barbershops/{barbershopId}/conversations/{id}/messages': {
        body: messages([message({ side: 'USER', senderName: 'Ana', body: 'Hola' })]),
      },
    });
    signIn({ roles: ['CLIENT', 'OWNER'] });
    await renderWithProviders(<ChatScreen conversationId="c1" />);
    expect(await screen.findByText('Hola')).toBeTruthy();
  });
});

describe('NewConversationScreen', () => {
  it('writes to a barbershop and opens the chat', async () => {
    const api = mockApi({
      'POST /api/v1/me/conversations': { status: 201, body: messages([message({ mine: true })]) },
    });
    const onStarted = jest.fn();
    await renderWithProviders(
      <NewConversationScreen target={{ kind: 'barbershop', barbershopId: 'shop-1' }} onStarted={onStarted} />,
    );
    await fireEvent.changeText(screen.getByTestId('new-message-input'), '¿Atienden hoy?');
    await fireEvent.press(screen.getByRole('button', { name: texts.chat.send }));
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith('c1'));
    expect(api.calls[0]!.body).toEqual({ barbershopId: 'shop-1', body: '¿Atienden hoy?', kind: 'CLIENT' });
  });
});
