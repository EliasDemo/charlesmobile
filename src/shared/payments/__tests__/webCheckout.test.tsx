import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@test/render';
import { TurboModuleRegistry } from 'react-native';
import { WebCheckout, checkoutAvailable } from '..';

const DONE = 'https://api.example/api/v1/payments/done';

// The native WebView: a stand-in that lets the test simulate navigations.
const mockNavigate: { current: ((url: string) => boolean) | null } = { current: null };
jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    WebView: ({
      onShouldStartLoadWithRequest,
    }: {
      onShouldStartLoadWithRequest: (r: { url: string }) => boolean;
    }) => {
      mockNavigate.current = (url) => onShouldStartLoadWithRequest({ url });
      return <View testID="webview" />;
    },
  };
});

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
