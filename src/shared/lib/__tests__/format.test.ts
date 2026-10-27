import { daysFromToday, formatLongDate, formatShortDate, formatTime, toLocalDate } from '../dates';
import { formatMoney } from '../money';
import { initials } from '../format';

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

describe('initials (unusual names)', () => {
  it('keeps a leading emoji whole', () => {
    expect(initials('😎 Carlos')).toBe('😎C');
    expect(Array.from(initials('💈')).length).toBe(1);
  });
  it('falls back for empty or blank names', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
  it('uses the first and last word of long names', () => {
    expect(initials('  maría   josé  de la   torre ')).toBe('MT');
  });
});

describe('daysFromToday', () => {
  const now = new Date('2030-01-07T23:30:00.000Z'); // 18:30 on Jan 7 in Lima
  it('counts calendar days in the barbershop zone, not the phone zone', () => {
    expect(daysFromToday('2030-01-08T02:00:00.000Z', 'America/Lima', now)).toBe(0); // 21:00 same day in Lima
    expect(daysFromToday('2030-01-08T15:00:00.000Z', 'America/Lima', now)).toBe(1);
    expect(daysFromToday('2030-01-10T15:00:00.000Z', 'America/Lima', now)).toBe(3);
    expect(daysFromToday('2030-01-06T15:00:00.000Z', 'America/Lima', now)).toBe(-1);
  });
});
