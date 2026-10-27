import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi, page } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/forums.json';
import { AskThreadScreen, ForumsHome, ThreadScreen } from '..';

type S = components['schemas'];
const author = (username: string, isBarber = false) => ({
  userId: `u-${username}`,
  username,
  photoUrl: null,
  isBarber,
});

const summary = (overrides: Partial<S['ThreadSummaryDto']> = {}): S['ThreadSummaryDto'] => ({
  id: 't1',
  title: '¿Cómo hago un degradado sin escalones?',
  excerpt: 'Siempre me quedan marcas.',
  categoryId: 'c1',
  categoryName: 'Técnicas de corte',
  author: author('ana'),
  createdAt: '2030-01-07T15:00:00.000Z',
  lastActivityAt: '2030-01-07T15:00:00.000Z',
  replyCount: 2,
  pinned: true,
  locked: false,
  solved: true,
  ...overrides,
});

const thread = (overrides: Partial<S['ThreadDto']> = {}): S['ThreadDto'] => ({
  ...summary(),
  body: 'Siempre me quedan marcas entre el 1 y el 2.',
  editedAt: null,
  isMine: false,
  solutionReplyId: null,
  solved: false,
  pinned: false,
  ...overrides,
});

const reply = (overrides: Partial<S['ReplyDto']> = {}): S['ReplyDto'] => ({
  id: 'r1',
  threadId: 't1',
  author: author('carlos', true),
  body: 'Usa el 1.5 en la transición.',
  createdAt: '2030-01-07T16:00:00.000Z',
  editedAt: null,
  helpful: 3,
  votedHelpful: false,
  isSolution: false,
  isMine: false,
  ...overrides,
});

const categories = [
  { id: 'c1', name: 'Técnicas de corte', slug: 'tecnicas-de-corte', description: null, threadCount: 4 },
  { id: 'c2', name: 'Barba', slug: 'barba', description: null, threadCount: 2 },
];

beforeEach(() => resetAppState());

describe('ForumsHome', () => {
  it('lists the threads with their marks and filters by topic', async () => {
    const api = mockApi({
      'GET /api/v1/forums/categories': { body: categories },
      'GET /api/v1/forums/threads': { body: page([summary()]) },
    });
    await renderWithProviders(
      <ForumsHome authenticated onOpenThread={jest.fn()} onAsk={jest.fn()} onRequireLogin={jest.fn()} />,
    );
    expect(await screen.findByText('¿Cómo hago un degradado sin escalones?')).toBeTruthy();
    expect(screen.getByText(texts.marks.pinned)).toBeTruthy();
    expect(screen.getByText(texts.marks.solved)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Barba' }));
    await waitFor(() =>
      expect(
        api.fetchMock.mock.calls.some(([r]) => new URL(r.url).searchParams.get('categoryId') === 'c2'),
      ).toBe(true),
    );
  });

  it('asks for an account before "Preguntar" without a session', async () => {
    mockApi({
      'GET /api/v1/forums/categories': { body: categories },
      'GET /api/v1/forums/threads': { body: page([]) },
    });
    const onAsk = jest.fn();
    const onRequireLogin = jest.fn();
    await renderWithProviders(
      <ForumsHome
        authenticated={false}
        onOpenThread={jest.fn()}
        onAsk={onAsk}
        onRequireLogin={onRequireLogin}
      />,
    );
    expect(await screen.findByText(texts.empty.title)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.ask.fab }));
    expect(onRequireLogin).toHaveBeenCalled();
    expect(onAsk).not.toHaveBeenCalled();
  });
});

describe('ThreadScreen', () => {
  it('says so when the thread was removed (410 THREAD_HIDDEN)', async () => {
    mockApi({
      'GET /api/v1/forums/threads/{id}': apiError(410, 'THREAD_HIDDEN'),
      'GET /api/v1/forums/threads/{id}/replies': { body: page([]) },
    });
    await renderWithProviders(
      <ThreadScreen threadId="t1" authenticated onRequireLogin={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(await screen.findByText(texts.hidden.title)).toBeTruthy();
  });

  it('highlights the best answer and votes "Me sirvió"', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/forums/threads/{id}': { body: thread({ solved: true, solutionReplyId: 'r1' }) },
      'GET /api/v1/forums/threads/{id}/replies': {
        body: page([reply({ isSolution: true }), reply({ id: 'r2', helpful: 0 })]),
      },
      'PUT /api/v1/forums/replies/{id}/helpful': { status: 204 },
    });
    await renderWithProviders(
      <ThreadScreen threadId="t1" authenticated onRequireLogin={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(await screen.findByText(texts.reply.best)).toBeTruthy();
    expect(screen.getAllByText(texts.barber).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Me sirvió · 3' }));
    await waitFor(() =>
      expect(
        api.calls.some((c) => c.method === 'PUT' && c.path === '/api/v1/forums/replies/r1/helpful'),
      ).toBe(true),
    );
    expect(screen.getByRole('button', { name: 'Me sirvió · 4' })).toBeTruthy();
  });

  it('lets the author mark the best answer, and never offers "Me sirvió" on one\'s own reply', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/forums/threads/{id}': { body: thread({ isMine: true }) },
      'GET /api/v1/forums/threads/{id}/replies': {
        body: page([reply(), reply({ id: 'r2', isMine: true, helpful: 0, body: 'Gracias' })]),
      },
      'PUT /api/v1/forums/threads/{id}/solution': { status: 204 },
    });
    await renderWithProviders(
      <ThreadScreen threadId="t1" authenticated onRequireLogin={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(await screen.findByText('Gracias')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Me sirvió/ })).toHaveLength(1);
    await fireEvent.press(screen.getAllByRole('button', { name: texts.reply.markBest })[0]!);
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'PUT' && c.path.endsWith('/solution'))!.body).toEqual({
        replyId: 'r1',
      }),
    );
  });

  it('answers, and explains it when support closed the thread meanwhile', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/forums/threads/{id}': { body: thread() },
      'GET /api/v1/forums/threads/{id}/replies': { body: page([]) },
      'POST /api/v1/forums/threads/{id}/replies': apiError(409, 'THREAD_LOCKED'),
    });
    await renderWithProviders(
      <ThreadScreen threadId="t1" authenticated onRequireLogin={jest.fn()} onDeleted={jest.fn()} />,
    );
    await fireEvent.changeText(await screen.findByTestId('reply-input'), '  Prueba con tijera  ');
    await fireEvent.press(screen.getByRole('button', { name: texts.reply.send }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({ body: 'Prueba con tijera' }),
    );
    expect(await screen.findByText(texts.thread.lockedSend)).toBeTruthy();
  });

  it('has no answer box on a closed thread', async () => {
    signIn();
    mockApi({
      'GET /api/v1/forums/threads/{id}': { body: thread({ locked: true }) },
      'GET /api/v1/forums/threads/{id}/replies': { body: page([]) },
    });
    await renderWithProviders(
      <ThreadScreen threadId="t1" authenticated onRequireLogin={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(await screen.findByText(texts.thread.locked)).toBeTruthy();
    expect(screen.queryByTestId('reply-input')).toBeNull();
  });
});

describe('AskThreadScreen', () => {
  it('validates the title length and sends the question', async () => {
    signIn();
    const api = mockApi({
      'GET /api/v1/forums/categories': { body: categories },
      'POST /api/v1/forums/threads': { status: 201, body: thread({ id: 't9', isMine: true }) },
    });
    const onCreated = jest.fn();
    await renderWithProviders(<AskThreadScreen onCreated={onCreated} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Barba' }));
    const title = screen.getByLabelText(texts.ask.title);
    await fireEvent.changeText(title, 'Corto');
    await fireEvent(title, 'blur');
    expect(await screen.findByText(texts.ask.titleLength)).toBeTruthy();
    await fireEvent.changeText(title, '¿Qué aceite uso para la barba?');
    await fireEvent.changeText(screen.getByLabelText(texts.ask.body), 'Tengo la piel seca.');
    await fireEvent.press(screen.getByRole('button', { name: texts.ask.publish }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('t9'));
    expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({
      categoryId: 'c2',
      title: '¿Qué aceite uso para la barba?',
      body: 'Tengo la piel seca.',
    });
  });

  it('explains words that are not allowed', async () => {
    signIn();
    mockApi({
      'GET /api/v1/forums/categories': { body: categories },
      'POST /api/v1/forums/threads': apiError(400, 'CONTENT_NOT_ALLOWED'),
    });
    await renderWithProviders(<AskThreadScreen categoryId="c1" onCreated={jest.fn()} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.ask.title), 'Una pregunta cualquiera');
    await fireEvent.changeText(screen.getByLabelText(texts.ask.body), 'Detalle');
    await fireEvent.press(screen.getByRole('button', { name: texts.ask.publish }));
    expect(await screen.findByText(texts.contentNotAllowed)).toBeTruthy();
  });
});
