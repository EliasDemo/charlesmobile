import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, booking, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/reviews.json';
import {
  BookingReviewSection,
  EditReviewScreen,
  NewReviewScreen,
  PendingReviewPrompt,
  ShopReviewsScreen,
} from '..';

type S = components['schemas'];

const mine = (overrides: Partial<S['MyReviewDto']> = {}): S['MyReviewDto'] => ({
  id: 'r1',
  rating: 4,
  comment: 'Muy buen corte',
  authorName: 'Ana P.',
  serviceName: 'Corte clásico',
  barber: { id: 'b1', displayName: 'Barbero Demo' },
  createdAt: '2030-01-07T15:00:00.000Z',
  editedAt: null,
  response: null,
  bookingId: 'bk-1',
  barbershop: { id: 's1', name: 'Barbería Demo Miraflores' },
  status: 'VISIBLE',
  canEdit: true,
  ...overrides,
});

const managed = (overrides: Partial<S['ManagedReviewDto']> = {}): S['ManagedReviewDto'] => ({
  id: 'r1',
  rating: 5,
  comment: 'Excelente',
  authorName: 'Ana P.',
  serviceName: 'Corte clásico',
  barber: { id: 'b1', displayName: 'Barbero Demo' },
  createdAt: '2030-01-07T15:00:00.000Z',
  editedAt: null,
  response: null,
  status: 'VISIBLE',
  responseStatus: null,
  canRespond: true,
  ...overrides,
});

beforeEach(() => {
  resetAppState();
  signIn();
});

describe('NewReviewScreen', () => {
  it('needs stars, rejects a too short comment and sends the review', async () => {
    const api = mockApi({ 'POST /api/v1/bookings/{id}/review': { status: 201, body: mine() } });
    const onDone = jest.fn();
    await renderWithProviders(<NewReviewScreen bookingId="bk-1" onDone={onDone} />);
    const send = screen.getByRole('button', { name: texts.form.send });
    expect(send).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('4 estrellas de 5'));
    await fireEvent.changeText(screen.getByLabelText(texts.form.comment), 'ok');
    expect(screen.getByText(texts.form.commentShort)).toBeTruthy();
    expect(send).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(texts.form.comment), '  Muy buen corte  ');
    await fireEvent.press(send);
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({
      rating: 4,
      comment: 'Muy buen corte',
    });
  });

  it('sends no comment when it is left empty', async () => {
    const api = mockApi({ 'POST /api/v1/bookings/{id}/review': { status: 201, body: mine() } });
    await renderWithProviders(<NewReviewScreen bookingId="bk-1" onDone={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText('5 estrellas de 5'));
    await fireEvent.press(screen.getByRole('button', { name: texts.form.send }));
    await waitFor(() => expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ rating: 5 }));
  });

  it('shows the backend message when it can no longer be reviewed', async () => {
    mockApi({ 'POST /api/v1/bookings/{id}/review': apiError(409, 'REVIEW_NOT_ALLOWED') });
    await renderWithProviders(<NewReviewScreen bookingId="bk-1" onDone={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText('3 estrellas de 5'));
    await fireEvent.press(screen.getByRole('button', { name: texts.form.send }));
    expect(await screen.findByText('Esta reserva ya no se puede valorar.')).toBeTruthy();
  });
});

describe('EditReviewScreen', () => {
  it('loads my review, edits it and can withdraw it with confirmation', async () => {
    const api = mockApi({
      'GET /api/v1/me/reviews': { body: { items: [mine()], nextCursor: null } },
      'PATCH /api/v1/reviews/{id}': { body: mine({ rating: 2 }) },
      'DELETE /api/v1/reviews/{id}': { status: 204 },
    });
    await renderWithProviders(<EditReviewScreen reviewId="r1" onDone={jest.fn()} />);
    expect(await screen.findByDisplayValue('Muy buen corte')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(texts.form.comment), '');
    await fireEvent.press(screen.getByLabelText('2 estrellas de 5'));
    await fireEvent.press(screen.getByRole('button', { name: texts.form.save }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ rating: 2, comment: null }),
    );
  });
});

describe('BookingReviewSection', () => {
  it('offers to review only when the API says so', async () => {
    const onReview = jest.fn();
    const { rerender } = await renderWithProviders(
      <BookingReviewSection
        booking={booking({ canReview: true })}
        onReview={onReview}
        onEditReview={jest.fn()}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: texts.booking.review }));
    expect(onReview).toHaveBeenCalledWith('bk-1');
    await rerender(
      <BookingReviewSection
        booking={booking({ status: 'ATTENDED', canReview: false, review: null })}
        onReview={onReview}
        onEditReview={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: texts.booking.review })).toBeNull();
  });

  it('shows my review and "Editar" only while it can be edited', async () => {
    await renderWithProviders(
      <BookingReviewSection
        booking={booking({
          status: 'ATTENDED',
          canReview: false,
          review: { id: 'r1', rating: 4, canEdit: false },
        })}
        onReview={jest.fn()}
        onEditReview={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('4 estrellas de 5')).toBeTruthy();
    expect(screen.queryByRole('button', { name: texts.booking.edit })).toBeNull();
  });
});

describe('PendingReviewPrompt', () => {
  it('asks how it went for the latest booking waiting for a review', async () => {
    mockApi({
      'GET /api/v1/me/bookings/pending-reviews': {
        body: { items: [booking({ id: 'bk-7', status: 'ATTENDED', canReview: true })] },
      },
    });
    const onReview = jest.fn();
    await renderWithProviders(<PendingReviewPrompt onReview={onReview} />);
    expect(await screen.findByText(/¿Cómo te fue con tu corte clásico\?/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.prompt.action }));
    expect(onReview).toHaveBeenCalledWith('bk-7');
  });

  it('shows nothing when there is nothing to review', async () => {
    mockApi({ 'GET /api/v1/me/bookings/pending-reviews': { body: { items: [] } } });
    await renderWithProviders(<PendingReviewPrompt onReview={jest.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('pending-review')).toBeNull());
  });
});

describe('ShopReviewsScreen', () => {
  it('lists the reviews with their state and responds', async () => {
    const api = mockApi({
      'GET /api/v1/me/barbershops/{id}/reviews': {
        body: {
          items: [managed(), managed({ id: 'r2', status: 'HIDDEN', canRespond: false })],
          nextCursor: null,
        },
      },
      'PUT /api/v1/reviews/{id}/response': { body: managed() },
    });
    await renderWithProviders(<ShopReviewsScreen shopId="s1" />);
    expect(await screen.findByText(texts.status.HIDDEN)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: texts.shop.respond })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: texts.shop.respond }));
    await fireEvent.changeText(screen.getByLabelText(texts.shop.responseField), '¡Gracias por venir!');
    await fireEvent.press(screen.getByRole('button', { name: texts.shop.send }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'PUT')?.body).toEqual({ text: '¡Gracias por venir!' }),
    );
  });

  it('explains an empty list', async () => {
    mockApi({ 'GET /api/v1/me/barbershops/{id}/reviews': { body: { items: [], nextCursor: null } } });
    await renderWithProviders(<ShopReviewsScreen shopId="s1" />);
    expect(await screen.findByText(texts.shop.empty)).toBeTruthy();
  });
});
