import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { booking, cancellationPreview, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import texts from '@/shared/i18n/locales/es/booking.json';
import type { CheckoutOutcome } from '@/shared/payments';
import { BookingScreen } from '..';

jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), useIsFocused: () => true }));

// The checkout page is native (react-native-webview): stand in with buttons that report a result.
jest.mock('@/shared/payments/WebCheckout', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    checkoutAvailable: () => true,
    WebCheckout: ({
      paymentUrl,
      onFinish,
    }: {
      paymentUrl: string;
      onFinish: (o: CheckoutOutcome) => void;
    }) => (
      <>
        <Text testID="checkout-url">{paymentUrl}</Text>
        {(['success', 'pending', 'error', 'closed'] as const).map((outcome) => (
          <Pressable
            key={outcome}
            accessibilityRole="button"
            accessibilityLabel={`finish-${outcome}`}
            onPress={() => onFinish(outcome)}
          />
        ))}
      </>
    ),
  };
});

const props = {
  id: 'bk-1',
  onBack: jest.fn(),
  onBookAgain: jest.fn(),
  onOpenBarbershop: jest.fn(),
  onHelp: jest.fn(),
  onReview: jest.fn(),
  onEditReview: jest.fn(),
};

const webAction = {
  type: 'MERCADOPAGO_WEB' as const,
  data: {
    paymentUrl: 'https://pay.example/checkout/1',
    doneUrlPrefix: 'https://api.example/api/v1/payments/done',
  },
};
const paymentStart = (clientAction: unknown) => ({
  paymentId: 'p1',
  provider: 'MERCADOPAGO',
  status: 'PENDING',
  amount: { amount: 2500, currency: 'PEN' },
  clientAction,
});

const routes = (extra: Record<string, unknown> = {}) => ({
  'GET /api/v1/bookings/{id}': { body: booking() },
  'GET /api/v1/bookings/{id}/cancellation-preview': { body: cancellationPreview() },
  ...extra,
});

const pay = () => screen.findByRole('button', { name: /Pagar S\/\s?25[.,]00/ });

beforeEach(() => {
  resetAppState();
  signIn();
});

describe('paying a pending booking', () => {
  it('opens the checkout page the backend sends and confirms only with the booking status', async () => {
    let reads = 0;
    mockApi(
      routes({
        'POST /api/v1/bookings/{id}/payment': { body: paymentStart(webAction) },
        'GET /api/v1/bookings/{id}': () => {
          reads++;
          return { body: booking(reads > 1 ? { status: 'CONFIRMED', expiresAt: null } : {}) };
        },
      }),
    );
    await renderWithProviders(<BookingScreen {...props} />);
    await fireEvent.press(await pay());
    expect(await screen.findByTestId('checkout-url')).toHaveTextContent('https://pay.example/checkout/1');
    await fireEvent.press(screen.getByRole('button', { name: 'finish-success' }));
    expect(screen.queryByTestId('checkout-url')).toBeNull();
    // The booking is read again; only CONFIRMED from the backend confirms it.
    expect(await screen.findByText(texts.detail.confirmedTitle)).toBeTruthy();
  });

  it('offers to retry after a rejected payment, with a new checkout', async () => {
    const api = mockApi(routes({ 'POST /api/v1/bookings/{id}/payment': { body: paymentStart(webAction) } }));
    await renderWithProviders(<BookingScreen {...props} />);
    await fireEvent.press(await pay());
    await fireEvent.press(await screen.findByRole('button', { name: 'finish-error' }));
    expect(await screen.findByText(texts.payment.failedTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.payment.retry }));
    await waitFor(() => expect(api.calls.filter((c) => c.method === 'POST').length).toBe(2));
  });

  it('explains a payment in process, and treats a closed page as maybe paid', async () => {
    mockApi(routes({ 'POST /api/v1/bookings/{id}/payment': { body: paymentStart(webAction) } }));
    await renderWithProviders(<BookingScreen {...props} />);
    await fireEvent.press(await pay());
    await fireEvent.press(await screen.findByRole('button', { name: 'finish-pending' }));
    expect(await screen.findByText(texts.payment.pendingTitle)).toBeTruthy();
    expect(await pay()).toBeDisabled();
  });

  it('closing the checkout by hand waits for the confirmation instead of failing', async () => {
    mockApi(routes({ 'POST /api/v1/bookings/{id}/payment': { body: paymentStart(webAction) } }));
    await renderWithProviders(<BookingScreen {...props} />);
    await fireEvent.press(await pay());
    await fireEvent.press(await screen.findByRole('button', { name: 'finish-closed' }));
    expect(await screen.findByText(texts.payment.confirming)).toBeTruthy();
  });

  it('with the development gateway, just waits for the backend', async () => {
    mockApi(
      routes({ 'POST /api/v1/bookings/{id}/payment': { body: paymentStart({ type: 'FAKE', data: {} }) } }),
    );
    await renderWithProviders(<BookingScreen {...props} />);
    await fireEvent.press(await pay());
    expect(await screen.findByText(texts.payment.waiting)).toBeTruthy();
    expect(screen.queryByTestId('checkout-url')).toBeNull();
  });

  it('explains when the gateway did not answer (no clientAction)', async () => {
    mockApi(routes({ 'POST /api/v1/bookings/{id}/payment': { body: paymentStart(null) } }));
    await renderWithProviders(<BookingScreen {...props} />);
    await fireEvent.press(await pay());
    expect(await screen.findByText(texts.payment.unavailable)).toBeTruthy();
  });
});
