import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import { ReviewLikeButton } from '../LikeButton';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  usePathname: () => '/barbershop/1',
}));

beforeEach(() => {
  resetAppState();
  signIn();
});

it('likes at once and goes back if the backend fails', async () => {
  const api = mockApi({ 'PUT /api/v1/reviews/{id}/like': apiError(500, 'INTERNAL_ERROR') } as never);
  await renderWithProviders(<ReviewLikeButton reviewId="r1" likes={2} likedByMe={false} />);
  await fireEvent.press(screen.getByTestId('like-r1'));
  await waitFor(() => expect(api.fetchMock).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
});

it('sends the like', async () => {
  const api = mockApi({ 'PUT /api/v1/reviews/{id}/like': { status: 204 } } as never);
  await renderWithProviders(<ReviewLikeButton reviewId="r1" likes={2} likedByMe={false} />);
  await fireEvent.press(screen.getByTestId('like-r1'));
  expect(await screen.findByText('3')).toBeTruthy();
  expect(api.calls.some((c) => c.method === 'PUT')).toBe(true);
});
