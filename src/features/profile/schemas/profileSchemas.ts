import { z } from 'zod';
import { peruMobileDigits } from '@/shared/lib';

/** `DD/MM/YYYY` as typed by the person → `YYYY-MM-DD` for the API, or null if it is not a real date. */
export function birthDateToIso(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` from the API → `DD/MM/YYYY` for the field. */
export const birthDateFromIso = (iso: string | null | undefined): string => {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'profile:password.required' }),
  newPassword: z
    .string()
    .refine((value) => value.length >= 10 && value.length <= 128, { error: 'validation.passwordLength' }),
});
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
