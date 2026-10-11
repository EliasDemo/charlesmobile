import { z } from 'zod';
import { peruMobileDigits } from '@/shared/lib';

// Client-side checks only improve the experience; the backend still decides (CLAUDE.md §1.4).
// Messages are i18n keys of the `auth` namespace, translated by the screen.

/** Documented by the API: RegisterDto.password minLength 10, maxLength 128. */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export const passwordLengthOk = (password: string) =>
  password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;

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
    .min(1, { error: 'validation.fullNameRequired', abort: true })
    .min(2, { error: 'validation.fullNameTooShort' })
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

// Re-exported for the register hook and its tests.
export { formatPeruMobile, peruMobileDigits } from '@/shared/lib';
