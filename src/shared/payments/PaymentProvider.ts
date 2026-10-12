import type { components } from '@/shared/api/generated/schema';

export type ClientPaymentAction = components['schemas']['ClientPaymentActionDto'];

/**
 * How the app presents a payment, chosen from `clientAction.type`. Nothing in the app is specific
 * to a gateway (Mercado Pago, Izipay…): everything comes in `clientAction`.
 * - `wait`: nothing to show (development gateway): wait for the backend confirmation.
 * - `web`: the gateway's checkout page, closed when it reaches `doneUrlPrefix`.
 */
export type Checkout = { kind: 'wait' } | { kind: 'web'; paymentUrl: string; doneUrlPrefix: string };

/**
 * What the checkout page reported when it finished (`status` of the done URL), or `closed` when
 * the person closed it by hand. It never means the booking is confirmed: only the booking status
 * returned by the backend does.
 */
export type CheckoutOutcome = 'success' | 'pending' | 'error' | 'cancel' | 'expired' | 'closed';

const OUTCOMES: readonly CheckoutOutcome[] = ['success', 'pending', 'error', 'cancel', 'expired'];

/** Picks the presentation from `clientAction`; null for an unknown type or missing data. */
export function checkoutFor(action: ClientPaymentAction | null | undefined): Checkout | null {
  if (!action) return null;
  if (action.type === 'FAKE') return { kind: 'wait' };
  const { paymentUrl, doneUrlPrefix } = action.data ?? {};
  if (paymentUrl && doneUrlPrefix) return { kind: 'web', paymentUrl, doneUrlPrefix };
  return null;
}

/** `status` of the done URL (success|pending|error|cancel|expired); anything else counts as closed. */
export function outcomeFromDoneUrl(url: string): CheckoutOutcome {
  const status = /[?&]status=([^&#]+)/.exec(url)?.[1];
  return OUTCOMES.includes(status as CheckoutOutcome) ? (status as CheckoutOutcome) : 'closed';
}
