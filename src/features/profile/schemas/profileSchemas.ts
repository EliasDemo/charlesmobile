import { z } from 'zod';
import { dmyToIsoDate, isoDateToDmy, passwordStrongEnough, peruMobileDigits } from '@/shared/lib';

/** `DD/MM/YYYY` as typed by the person → `YYYY-MM-DD` for the API, or null if it is not a real date. */
export const birthDateToIso = dmyToIsoDate;

/** `YYYY-MM-DD` from the API → `DD/MM/YYYY` for the field. */
export const birthDateFromIso = isoDateToDmy;

// Messages are i18n keys of the `auth` namespace (shared validation texts), or `profile:` keys.
export const editProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { error: 'validation.fullNameRequired', abort: true })
    .min(2, { error: 'validation.fullNameTooShort' })
    .max(120, { error: 'validation.fullNameTooLong' }),
  /** Empty removes the phone; otherwise a Peruvian mobile, as in sign-up. */
  phone: z.string().refine((value) => value.trim() === '' || peruMobileDigits(value) !== null, {
    error: 'validation.phoneInvalid',
  }),
  /** Optional. The minimum age is the backend's rule (it answers `minimumAge`). */
  birthDate: z.string().refine((value) => value.trim() === '' || birthDateToIso(value) !== null, {
    error: 'profile:birthDateInvalid',
  }),
  gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
});
export type EditProfileForm = z.infer<typeof editProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'profile:password.required' }),
    newPassword: z
      .string()
      .refine((value) => value.length >= 10 && value.length <= 128, {
        error: 'validation.passwordLength',
        abort: true,
      })
      .refine(passwordStrongEnough, { error: 'validation.passwordWeak' }),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    error: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
