import { z } from 'zod';
import { peruMobileDigits } from '@/shared/lib';

// Messages are i18n keys of the `auth` namespace (shared validation texts).
export const editProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { error: 'validation.fullNameRequired' })
    .max(120, { error: 'validation.fullNameTooLong' }),
  /** Empty removes the phone; otherwise a Peruvian mobile, as in sign-up. */
  phone: z.string().refine((value) => value.trim() === '' || peruMobileDigits(value) !== null, {
    error: 'validation.phoneInvalid',
  }),
});
export type EditProfileForm = z.infer<typeof editProfileSchema>;
