import { birthDateFromIso, birthDateToIso, editProfileSchema } from '../schemas/profileSchemas';

describe('birth date', () => {
  it('turns what the person types into the ISO date the API expects, and back', () => {
    expect(birthDateToIso('23/04/1995')).toBe('1995-04-23');
    expect(birthDateToIso('3/4/1995')).toBe('1995-04-03');
    expect(birthDateFromIso('1995-04-23')).toBe('23/04/1995');
    expect(birthDateFromIso(null)).toBe('');
  });

  it('rejects dates that do not exist or are badly written', () => {
    expect(birthDateToIso('31/02/1995')).toBeNull();
    expect(birthDateToIso('1995-04-23')).toBeNull();
    expect(birthDateToIso('23/13/1995')).toBeNull();
  });

  it('is optional, like the gender', () => {
    const base = { fullName: 'Ana Pérez', phone: '', username: 'ana.perez' };
    expect(editProfileSchema.safeParse({ ...base, birthDate: '', gender: '' }).success).toBe(true);
    expect(editProfileSchema.safeParse({ ...base, birthDate: '99/99/1995', gender: '' }).success).toBe(false);
    expect(editProfileSchema.safeParse({ ...base, birthDate: '', gender: 'PREFER_NOT_TO_SAY' }).success).toBe(
      true,
    );
  });
});
