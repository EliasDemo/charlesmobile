import { z } from 'zod';

// Limits published in the contract (FOROS.md). Messages are `forums` i18n keys.
export const TITLE_MIN = 8;
export const TITLE_MAX = 140;
export const THREAD_BODY_MAX = 5000;
export const REPLY_MAX = 3000;

export const threadSchema = z.object({
  categoryId: z.string().min(1, { error: 'ask.categoryRequired' }),
  title: z
    .string()
    .trim()
    .min(TITLE_MIN, { error: 'ask.titleLength' })
    .max(TITLE_MAX, { error: 'ask.titleLength' }),
  body: z
    .string()
    .trim()
    .min(1, { error: 'ask.bodyRequired' })
    .max(THREAD_BODY_MAX, { error: 'ask.bodyLength' }),
});
export type ThreadForm = z.infer<typeof threadSchema>;
