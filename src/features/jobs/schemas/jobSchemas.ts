import { z } from 'zod';
import { dmyToIsoDate } from '@/shared/lib';

// Limits published in the contract (CreateJobPostingDto). Messages are `jobs` i18n keys.
export const jobSchema = z.object({
  title: z.string().trim().min(5, { error: 'form.titleLength' }).max(80, { error: 'form.titleLength' }),
  description: z
    .string()
    .trim()
    .min(20, { error: 'form.descriptionLength' })
    .max(2000, { error: 'form.descriptionLength' }),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'WEEKENDS', 'COMMISSION', 'FREELANCE']),
  compensationText: z.string().max(120, { error: 'form.compensationLength' }),
  styleIds: z.array(z.string()),
  /** Optional; at most 90 days ahead (the backend checks it). */
  closesAt: z
    .string()
    .refine((v) => v.trim() === '' || dmyToIsoDate(v) !== null, { error: 'form.dateInvalid' }),
});
export type JobForm = z.infer<typeof jobSchema>;
