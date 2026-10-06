import type { components } from '@/shared/api/generated/schema';

export type ClientPaymentAction = components['schemas']['ClientPaymentActionDto'];

/**
 * Result of showing the payment to the user. It never means the booking is confirmed:
 * only the booking status returned by the backend does.
 */
export type PaymentPresentationResult =
  /** Forward `payload` untouched to POST /bookings/{id}/payment/verify. */
  | { kind: 'submitted'; payload: Record<string, unknown> | null }
  | { kind: 'cancelled' }
  | { kind: 'failed'; reason: string };

export interface PaymentProvider {
  readonly type: string;
  present(action: ClientPaymentAction): Promise<PaymentPresentationResult>;
}
