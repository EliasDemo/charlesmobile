import { z } from 'zod';

// Limits published in the contract (UpsertBarberProfileDto). Messages are `career` i18n keys.
const optionalText = (min: number, max: number, message: string) =>
  z
    .string()
    .refine((v) => v.trim() === '' || (v.trim().length >= min && v.trim().length <= max), { error: message });

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { error: 'form.displayNameLength' })
    .max(60, { error: 'form.displayNameLength' }),
  headline: optionalText(1, 80, 'form.headlineLength'),
  bio: optionalText(1, 600, 'form.bioLength'),
  yearsExperience: z.string().refine((v) => v.trim() === '' || (/^\d+$/.test(v.trim()) && Number(v) <= 60), {
    error: 'form.yearsRange',
  }),
  district: optionalText(2, 60, 'form.districtLength'),
  availableForWork: z.boolean(),
});
export type ProfileForm = z.infer<typeof profileSchema>;
