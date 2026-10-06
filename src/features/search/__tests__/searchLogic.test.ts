import {
  formatDistance,
  formatMinutes,
  formatMoney,
  formatRating,
  initials,
  upcomingDays,
} from '@/shared/lib';
import { PRICE_PRESETS, money } from '../config/pricePresets';
import { EMPTY_FILTERS, activeFilterCount, buildSearchParams, useSearchStore } from '../hooks/searchStore';

const center = { latitude: -12.11, longitude: -77.03, source: 'device' as const };

describe('buildSearchParams', () => {
  it('sends nothing by default (the backend orders by rating without location)', () => {
    expect(buildSearchParams('', EMPTY_FILTERS, null)).toEqual({});
  });

  it('ignores text shorter than 2 characters and trims it', () => {
    expect(buildSearchParams(' a ', EMPTY_FILTERS, null)).toEqual({});
    expect(buildSearchParams('  corte ', EMPTY_FILTERS, null)).toEqual({ q: 'corte' });
  });

  it('maps every filter to the documented query params', () => {
    const params = buildSearchParams(
      'fade',
      {
        category: 'haircut',
        pricePreset: 'from20to40',
        minRating: 4,
        type: 'INDEPENDENT',
        openNow: true,
        availableNow: true,
        date: '2030-01-07',
        sort: 'price',
        radiusKm: 10,
      },
      center,
    );
    expect(params).toEqual({
      q: 'fade',
      lat: -12.11,
      lng: -77.03,
      radiusKm: 10,
      category: 'haircut',
      minPrice: 2000,
      maxPrice: 4000,
      minRating: 4,
      type: 'INDEPENDENT',
      openNow: true,
      availableNow: true,
      date: '2030-01-07',
      sort: 'price',
    });
  });

  it('never sends distance order or radius without a center', () => {
    const params = buildSearchParams('', { ...EMPTY_FILTERS, sort: 'distance', radiusKm: 5 }, null);
    expect(params).toEqual({});
  });

  it('uses the price presets as configured', () => {
    expect(buildSearchParams('', { ...EMPTY_FILTERS, pricePreset: 'upTo20' }, null)).toEqual({
      maxPrice: 2000,
    });
    expect(buildSearchParams('', { ...EMPTY_FILTERS, pricePreset: 'over40' }, null)).toEqual({
      minPrice: 4001,
    });
  });
});

describe('search store', () => {
  it('counts the active filters (the category chip is separate)', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, category: 'haircut', openNow: true, minRating: 4 })).toBe(2);
  });

  it('drops the distance order when the location is removed', () => {
    useSearchStore.setState({ center, filters: { ...EMPTY_FILTERS, sort: 'distance' } });
    useSearchStore.getState().setCenter(null);
    expect(useSearchStore.getState().filters.sort).toBeNull();
  });

  it('remembers that the backend rejected the coordinates', () => {
    useSearchStore.setState({ center, outsidePeru: false });
    useSearchStore.getState().rejectCenter();
    expect(useSearchStore.getState()).toMatchObject({ center: null, outsidePeru: true });
    useSearchStore.getState().setCenter(center);
    expect(useSearchStore.getState().outsidePeru).toBe(false);
  });

  it('cuts the text at 80 characters', () => {
    useSearchStore.getState().setText('x'.repeat(100));
    expect(useSearchStore.getState().text).toHaveLength(80);
  });
});

describe('display formatters', () => {
  it('formats distances, durations and ratings', () => {
    expect(formatDistance(350)).toBe('350 m');
    expect(formatDistance(1234)).toMatch(/^1[.,]2 km$/);
    expect(formatMinutes(30)).toBe('30 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(75)).toBe('1 h 15 min');
    expect(formatRating(4.5)).toMatch(/^4[.,]5$/);
    expect(initials('Barbería Demo Miraflores')).toBe('BM');
    expect(initials('Charles')).toBe('C');
  });

  it('builds the price labels from the presets', () => {
    expect(formatMoney(money(PRICE_PRESETS[0].maxPrice), { compact: true })).toMatch(/S\/\s?20$/);
    expect(formatMoney(money(2050), { compact: true })).toMatch(/20[.,]5/);
  });

  it('lists the next days in the shop zone, not the phone zone', () => {
    // 03:00 UTC on Jan 8 is still Jan 7 in Lima.
    const days = upcomingDays('America/Lima', 3, new Date('2030-01-08T03:00:00.000Z'));
    expect(days).toEqual([
      { date: '2030-01-07', dayOfWeek: 1, dayOfMonth: 7 },
      { date: '2030-01-08', dayOfWeek: 2, dayOfMonth: 8 },
      { date: '2030-01-09', dayOfWeek: 3, dayOfMonth: 9 },
    ]);
  });
});
