import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@test/render';
import { Linking, TurboModuleRegistry } from 'react-native';
import { WebCheckout, checkoutAvailable } from '..';

const DONE = 'https://api.example/api/v1/payments/done';

// The native WebView: a stand-in that lets the test simulate navigations.
const mockNavigate: { current: ((url: string) => boolean) | null } = { current: null };
const mockState: { current: ((url: string) => void) | null } = { current: null };
const mockSource: { current: string | null } = { current: null };
const mockFail: { current: (() => void) | null } = { current: null };
jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    WebView: ({
      onShouldStartLoadWithRequest,
      onNavigationStateChange,
      onError,
      source,
    }: {
      onError: () => void;
      onShouldStartLoadWithRequest: (r: { url: string }) => boolean;
      onNavigationStateChange: (s: { url: string; canGoBack: boolean }) => void;
      source: { uri: string };
    }) => {
      mockNavigate.current = (url) => onShouldStartLoadWithRequest({ url });
      mockState.current = (url) => onNavigationStateChange({ url, canGoBack: false });
      mockSource.current = source.uri;
      mockFail.current = onError;
      return <View testID="webview" />;
    },
  };
});

// The Modal shows its content right away (no native presentation delay under load).
jest.mock('react-native/Libraries/Modal/Modal', () => ({
  __esModule: true,
  default: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null,
}));

const mockOpenAuth = jest.fn();
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: (...a: unknown[]) => mockOpenAuth(...a) }));

const mockOptional = jest.fn();
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: (n: string) => mockOptional(n),
}));

const realGet = TurboModuleRegistry.get.bind(TurboModuleRegistry);
const withWebView = (available: boolean) =>
  jest
    .spyOn(TurboModuleRegistry, 'get')
    .mockImplementation(((name: string) =>
      name === 'RNCWebViewModule' ? (available ? {} : null) : realGet(name)) as never);

const renderCheckout = (onFinish = jest.fn()) =>
  renderWithProviders(
    <WebCheckout paymentUrl="https://pay.example/1" doneUrlPrefix={DONE} onFinish={onFinish} />,
  );

beforeEach(() => {
  jest.restoreAllMocks();
  mockOptional.mockReturnValue(null);
  mockOpenAuth.mockReset();
  mockNavigate.current = null;
});

describe('WebCheckout with the in-app browser', () => {
  it('lets the gateway pages load and finishes when the done URL is reached', async () => {
    withWebView(true);
    const onFinish = jest.fn();
    await renderCheckout(onFinish);
    expect(await screen.findByTestId('webview')).toBeTruthy();
    expect(mockNavigate.current!('https://pay.example/1/step2')).toBe(true);
    expect(mockNavigate.current!(`${DONE}?status=success&paymentId=p&bookingId=b`)).toBe(false);
    expect(onFinish).toHaveBeenCalledWith('success');
    // Only once, even if the page keeps navigating.
    mockNavigate.current!(`${DONE}?status=error`);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('reports "closed" when the person closes it by hand', async () => {
    withWebView(true);
    const onFinish = jest.fn();
    await renderCheckout(onFinish);
    await fireEvent.press(await screen.findByTestId('checkout-close'));
    expect(onFinish).toHaveBeenCalledWith('closed');
  });
});

describe('WebCheckout links inside the gateway', () => {
  it('opens wallet or bank apps outside, and loads the web fallback of an intent link', async () => {
    withWebView(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderCheckout();
    await screen.findByTestId('webview');
    expect(mockNavigate.current!('mercadopago://checkout/123')).toBe(false);
    expect(openURL).toHaveBeenCalledWith('mercadopago://checkout/123');
    await act(async () => {
      mockNavigate.current!(
        'intent://pay#Intent;scheme=yape;S.browser_fallback_url=https%3A%2F%2Fpay.example%2Fweb;end',
      );
    });
    await waitFor(() => expect(mockSource.current).toBe('https://pay.example/web'));
  });

  it('finishes when a redirect reaches the done page without a load request (iOS)', async () => {
    withWebView(true);
    const onFinish = jest.fn();
    await renderCheckout(onFinish);
    await screen.findByTestId('webview');
    mockState.current!(`${DONE}?status=cancel`);
    expect(onFinish).toHaveBeenCalledWith('cancel');
  });
});

describe('WebCheckout when the page fails', () => {
  it('shows the error with retry, and the system browser as a way out', async () => {
    withWebView(true);
    mockOptional.mockImplementation((name: string) => (name === 'ExpoWebBrowser' ? {} : null));
    mockOpenAuth.mockResolvedValue({ type: 'dismiss' });
    const onFinish = jest.fn();
    await renderCheckout(onFinish);
    await screen.findByTestId('webview');
    await act(async () => mockFail.current!());
    expect(await screen.findByTestId('checkout-failed')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /abrir en el navegador/i }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith('closed'));
    await fireEvent.press(screen.getByRole('button', { name: /reintentar/i }));
    expect(screen.queryByTestId('checkout-failed')).toBeNull();
  });
});

describe('WebCheckout with the system browser (fallback)', () => {
  it('reads the status from the done URL', async () => {
    withWebView(false);
    mockOptional.mockImplementation((name: string) => (name === 'ExpoWebBrowser' ? {} : null));
    mockOpenAuth.mockResolvedValue({ type: 'success', url: `${DONE}?status=pending` });
    const onFinish = jest.fn();
    await renderCheckout(onFinish);
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith('pending'));
    expect(mockOpenAuth).toHaveBeenCalledWith('https://pay.example/1', DONE);
  });

  it('treats a dismissed browser as closed', async () => {
    withWebView(false);
    mockOptional.mockImplementation((name: string) => (name === 'ExpoWebBrowser' ? {} : null));
    mockOpenAuth.mockResolvedValue({ type: 'dismiss' });
    const onFinish = jest.fn();
    await renderCheckout(onFinish);
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith('closed'));
  });
});

describe('checkoutAvailable', () => {
  it('is false in a build without any browser module', () => {
    withWebView(false);
    expect(checkoutAvailable()).toBe(false);
    withWebView(true);
    expect(checkoutAvailable()).toBe(true);
  });
});
