import { z } from 'zod';
import { PASSWORD_MAX, PASSWORD_MIN, passwordStrongEnough, peruMobileDigits } from '@/shared/lib';

// Client-side checks only improve the experience; the backend still decides (CLAUDE.md §1.4).
// Messages are i18n keys of the `auth` namespace, translated by the screen.

/** Documented by the API: RegisterDto.password minLength 10, maxLength 128. */
export { PASSWORD_MAX, PASSWORD_MIN };

export const passwordLengthOk = (password: string) =>
  password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;

const email = z
  .string()
  .trim()
  .pipe(z.email({ error: 'validation.emailInvalid' }));
const password = z
  .string()
  .refine(passwordLengthOk, { error: 'validation.passwordLength', abort: true })
  .refine(passwordStrongEnough, { error: 'validation.passwordWeak' });

const code = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: 'validation.codeInvalid' });

/** Username rules (USUARIO.md): 3 to 20, lowercase, numbers, "." and "_", not at the ends nor doubled. */
export const USERNAME_PATTERN = /^(?![._])(?!.*[._]{2})[a-z0-9._]{3,20}(?<![._])$/;
export const usernameOk = (value: string) => USERNAME_PATTERN.test(value.trim().toLowerCase());

export const loginSchema = z.object({
  /** Username or email (with "@" it is taken as an email). */
  login: z.string().trim().min(1, { error: 'validation.loginRequired' }),
  password: z.string().min(1, { error: 'validation.passwordRequired' }),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, { error: 'validation.fullNameRequired', abort: true })
      .min(2, { error: 'validation.fullNameTooShort' })
      .max(120, { error: 'validation.fullNameTooLong' }),
    email,
    username: z.string().refine(usernameOk, { error: 'validation.usernameInvalid' }),
    password,
    phone: z.string().refine((value) => value.trim() === '' || peruMobileDigits(value) !== null, {
      error: 'validation.phoneInvalid',
    }),
    declaresAdult: z.boolean().refine((value) => value, { error: 'validation.adultRequired' }),
    acceptTerms: z.boolean().refine((value) => value, { error: 'validation.termsRequired' }),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  });
export type RegisterForm = z.infer<typeof registerSchema>;

export const codeSchema = z.object({ code });
export type CodeForm = z.infer<typeof codeSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ code, newPassword: password, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, {
    error: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

// Re-exported for the register hook and its tests.
export { formatPeruMobile, peruMobileDigits } from '@/shared/lib';
