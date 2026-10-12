import { checkoutFor, outcomeFromDoneUrl } from '..';

describe('checkoutFor', () => {
  it('waits for the backend with the development gateway', () => {
    expect(checkoutFor({ type: 'FAKE', data: {} })).toEqual({ kind: 'wait' });
  });

  it('opens the checkout page of any web gateway with what the backend sends', () => {
    const data = {
      paymentUrl: 'https://pay.example/x',
      doneUrlPrefix: 'https://api.example/api/v1/payments/done',
    };
    expect(checkoutFor({ type: 'MERCADOPAGO_WEB', data })).toEqual({ kind: 'web', ...data });
    expect(checkoutFor({ type: 'IZIPAY_WEB', data })).toEqual({ kind: 'web', ...data });
  });

  it('returns null without an action or without its data', () => {
    expect(checkoutFor(null)).toBeNull();
    expect(checkoutFor({ type: 'MERCADOPAGO_WEB', data: {} })).toBeNull();
  });
});

describe('outcomeFromDoneUrl', () => {
  it.each(['success', 'pending', 'error', 'cancel', 'expired'] as const)('reads %s', (status) => {
    expect(
      outcomeFromDoneUrl(`https://api.example/api/v1/payments/done?status=${status}&paymentId=p&bookingId=b`),
    ).toBe(status);
  });

  it('treats an unknown or missing status as closed', () => {
    expect(outcomeFromDoneUrl('https://api.example/api/v1/payments/done?status=weird')).toBe('closed');
    expect(outcomeFromDoneUrl('https://api.example/api/v1/payments/done')).toBe('closed');
  });
});
