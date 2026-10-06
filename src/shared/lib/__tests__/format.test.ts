import { formatLongDate, formatShortDate, formatTime, toLocalDate } from '../dates';
import { formatMoney } from '../money';

describe('formatMoney', () => {
  it('shows céntimos as soles without doing arithmetic on prices', () => {
    expect(formatMoney({ amount: 2500, currency: 'PEN' })).toMatch(/S\/\s?25[.,]00/);
    expect(formatMoney({ amount: 5, currency: 'PEN' })).toMatch(/0[.,]05/);
  });

  it('respects the currency minor units', () => {
    expect(formatMoney({ amount: 1500, currency: 'USD' })).toMatch(/15[.,]00/);
  });
});

describe('dates in the barbershop time zone', () => {
  // 14:00 UTC = 09:00 in Lima (UTC-5), whatever the phone zone is.
  const instant = '2030-01-07T14:00:00.000Z';

  it('formats the time in the barbershop zone', () => {
    expect(formatTime(instant, 'America/Lima')).toBe('09:00');
    expect(formatTime(instant, 'UTC')).toBe('14:00');
  });

  it('formats dates in Spanish', () => {
    expect(formatLongDate(instant, 'America/Lima')).toMatch(/lunes.*7.*enero.*2030/);
    expect(formatShortDate(instant, 'America/Lima')).toMatch(/7/);
  });

  it('computes the local calendar day', () => {
    expect(toLocalDate('2030-01-08T03:00:00.000Z', 'America/Lima')).toBe('2030-01-07');
    expect(toLocalDate('2030-01-08T03:00:00.000Z', 'UTC')).toBe('2030-01-08');
  });
});
