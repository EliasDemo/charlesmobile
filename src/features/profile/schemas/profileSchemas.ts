import { z } from 'zod';

// Messages are i18n keys of the `auth` namespace (shared validation texts).
export const editProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { error: 'validation.fullNameRequired' })
    .max(120, { error: 'validation.fullNameTooLong' }),
});
export type EditProfileForm = z.infer<typeof editProfileSchema>;
