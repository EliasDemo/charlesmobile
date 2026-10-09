import { centimosToSoles, solesToCentimos } from '../hooks/useServices';
import { toDays, toWeek, weekIsValid } from '../hooks/useWeekSchedule';

describe('solesToCentimos', () => {
  it.each([
    ['25', 2500],
    ['25.5', 2550],
    ['25,50', 2550],
    [' 0.05 ', 5],
  ])('converts %p', (input, expected) => {
    expect(solesToCentimos(input)).toBe(expected);
  });

  it.each(['', '0', 'abc', '25.505', '-3', '1e3'])('rejects %p', (input) => {
    expect(solesToCentimos(input)).toBeNull();
  });

  it('shows céntimos back as soles for editing', () => {
    expect(centimosToSoles(2550)).toBe('25.50');
    expect(centimosToSoles(5)).toBe('0.05');
  });
});

describe('week schedule', () => {
  it('round-trips the API days, sorting windows and dropping closed days', () => {
    const week = toWeek([
      {
        dayOfWeek: 1,
        windows: [
          { start: '14:00', end: '20:00' },
          { start: '09:00', end: '13:00' },
        ],
      },
    ]);
    expect(week[0]).toEqual([]);
    expect(toDays(week)).toEqual([
      {
        dayOfWeek: 1,
        windows: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '20:00' },
        ],
      },
    ]);
  });

  it('rejects windows that end before starting or overlap', () => {
    const ok = toWeek([{ dayOfWeek: 2, windows: [{ start: '09:00', end: '13:00' }] }]);
    expect(weekIsValid(ok)).toBe(true);
    expect(weekIsValid({ ...ok, 2: [{ start: '13:00', end: '09:00' }] })).toBe(false);
    expect(
      weekIsValid({
        ...ok,
        2: [
          { start: '09:00', end: '13:00' },
          { start: '12:00', end: '15:00' },
        ],
      }),
    ).toBe(false);
  });
});
