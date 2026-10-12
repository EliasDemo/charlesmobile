import { paymentProviderFor } from '..';

describe('paymentProviderFor', () => {
  it('uses the FAKE adapter, which only waits for the backend confirmation', async () => {
    const provider = paymentProviderFor({ type: 'FAKE', data: { paymentId: 'p1' } });
    expect(provider?.type).toBe('FAKE');
    await expect(provider?.present({ type: 'FAKE', data: { paymentId: 'p1' } })).resolves.toEqual({
      kind: 'submitted',
      payload: null,
    });
  });

  it('has no Izipay adapter until M5', () => {
    expect(paymentProviderFor({ type: 'IZIPAY_WEB', data: {} })).toBeNull();
  });
});
