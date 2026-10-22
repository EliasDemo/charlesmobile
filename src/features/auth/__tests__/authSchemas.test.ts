import {
  formatPeruMobile,
  loginSchema,
  passwordLengthOk,
  peruMobileDigits,
  registerSchema,
  resetPasswordSchema,
} from '../schemas/authSchemas';

describe('Peru mobile numbers', () => {
  it.each(['987654321', '987 654 321', '+51 987 654 321', '+51987654321', '51987654321', '987-654-321'])(
    'accepts %s',
    (input) => expect(peruMobileDigits(input)).toBe('987654321'),
  );

  it.each(['887654321', '98765432', '9876543210', '+1 987 654 321', '01 987654321', 'abc'])(
    'rejects %s',
    (input) => expect(peruMobileDigits(input)).toBeNull(),
  );

  it('formats as the backend example', () => {
    expect(formatPeruMobile('987654321')).toBe('+51 987 654 321');
  });
});

describe('password length (documented 10 to 128)', () => {
  it('checks both limits', () => {
    expect(passwordLengthOk('a'.repeat(9))).toBe(false);
    expect(passwordLengthOk('a'.repeat(10))).toBe(true);
    expect(passwordLengthOk('a'.repeat(128))).toBe(true);
    expect(passwordLengthOk('a'.repeat(129))).toBe(false);
  });
});

describe('schemas', () => {
  const validRegister = {
    fullName: 'Ana',
    email: 'ana@example.com',
    username: 'ana.perez',
    password: 'Una-Clave-Larga1',
    confirmPassword: 'Una-Clave-Larga1',
    phone: '',
    declaresAdult: true,
    acceptTerms: true,
  };

  it('accepts a valid registration with or without phone', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
    expect(registerSchema.safeParse({ ...validRegister, phone: '987 654 321' }).success).toBe(true);
  });

  it('reports each rule with an i18n key', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      fullName: ' ',
      email: 'nope',
      password: 'corta',
      phone: '123',
      declaresAdult: false,
      acceptTerms: false,
    });
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(result.error!.issues.map((i) => [i.path[0], i.message]));
    expect(messages).toEqual({
      fullName: 'validation.fullNameRequired',
      email: 'validation.emailInvalid',
      password: 'validation.passwordLength',
      phone: 'validation.phoneInvalid',
      declaresAdult: 'validation.adultRequired',
      acceptTerms: 'validation.termsRequired',
    });
  });

  it('trims the username or email at login', () => {
    expect(loginSchema.parse({ login: ' ana@example.com ', password: 'x' }).login).toBe('ana@example.com');
  });

  it('requires a 6-digit code', () => {
    expect(
      resetPasswordSchema.safeParse({
        code: '12345',
        newPassword: 'Una-Clave-Larga1',
        confirmPassword: 'Una-Clave-Larga1',
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        code: '123456',
        newPassword: 'Una-Clave-Larga1',
        confirmPassword: 'Una-Clave-Larga1',
      }).success,
    ).toBe(true);
  });
});
