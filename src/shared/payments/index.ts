import type { ClientPaymentAction, PaymentProvider } from './PaymentProvider';
import { fakePaymentProvider } from './fakePaymentProvider';

export type { ClientPaymentAction, PaymentPresentationResult, PaymentProvider } from './PaymentProvider';

// The Izipay adapter (IZIPAY_SDK) is added in M5; the native SDK is already in the build.
const providers: Record<string, PaymentProvider> = { [fakePaymentProvider.type]: fakePaymentProvider };

/** Picks the adapter from `clientAction.type`. Screens never call a payment SDK directly. */
export function paymentProviderFor(action: ClientPaymentAction): PaymentProvider | null {
  return providers[action.type] ?? null;
}
