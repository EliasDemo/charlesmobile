import { randomUUID } from 'expo-crypto';

/**
 * One key per user attempt (e.g. per tap on "Reservar"). Keep it while that attempt is retried
 * and create a new one only for a new attempt.
 */
export const newIdempotencyKey = (): string => randomUUID();
