import { formatMoney, formatShortDate, setDisplayLanguage } from '..';

afterEach(() => setDisplayLanguage('es'));

describe('display language', () => {
  it('formats money and dates in the chosen language, hours still in the barbershop zone', () => {
    const money = { amount: 2550, currency: 'PEN' };
    expect(formatMoney(money)).toMatch(/S\/\s?25[.,]50/);
    setDisplayLanguage('en');
    expect(formatMoney(money)).toMatch(/PEN\s?25\.50|S\/\s?25\.50/);
    expect(formatShortDate('2030-01-07T14:00:00.000Z', 'America/Lima')).toMatch(/Mon/);
  });
});
