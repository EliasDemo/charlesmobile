import { z } from 'zod';

// Client-side checks only improve the experience; the backend still decides (CLAUDE.md §1.4).
// Messages are i18n keys of the `auth` namespace, translated by the screen.

/** Documented by the API: RegisterDto.password minLength 10, maxLength 128. */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export const passwordLengthOk = (password: string) =>
  password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;

const PERU_MOBILE = /^9\d{8}$/;

/**
 * Accepts "987654321", "987 654 321", "+51 987 654 321" or "51987654321" and returns the
 * national 9-digit number, or null when it is not a Peruvian mobile number.
 */
export function peruMobileDigits(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+51')) digits = digits.slice(3);
  else if (digits.length === 11 && digits.startsWith('51')) digits = digits.slice(2);
  return PERU_MOBILE.test(digits) ? digits : null;
}

/** Format sent to the backend, as in its example: "+51 987 654 321". */
export function formatPeruMobile(digits: string): string {
  return `+51 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

const email = z
  .string()
  .trim()
  .pipe(z.email({ error: 'validation.emailInvalid' }));
const password = z.string().refine(passwordLengthOk, { error: 'validation.passwordLength' });
const code = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: 'validation.codeInvalid' });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: 'validation.passwordRequired' }),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { error: 'validation.fullNameRequired' })
    .max(120, { error: 'validation.fullNameTooLong' }),
  email,
  password,
  phone: z.string().refine((value) => value.trim() === '' || peruMobileDigits(value) !== null, {
    error: 'validation.phoneInvalid',
  }),
  declaresAdult: z.boolean().refine((value) => value, { error: 'validation.adultRequired' }),
  acceptTerms: z.boolean().refine((value) => value, { error: 'validation.termsRequired' }),
});
export type RegisterForm = z.infer<typeof registerSchema>;

export const codeSchema = z.object({ code });
export type CodeForm = z.infer<typeof codeSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({ code, newPassword: password });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
