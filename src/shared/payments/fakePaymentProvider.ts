import type { PaymentProvider } from './PaymentProvider';

/** Development gateway: nothing to show, the app just waits for the backend confirmation. */
export const fakePaymentProvider: PaymentProvider = {
  type: 'FAKE',
  present: async () => ({ kind: 'submitted', payload: null }),
};
