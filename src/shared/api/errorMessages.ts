import { i18n } from '@/shared/i18n';
import { isApiError, isNetworkError } from './errors';

export interface ErrorMessage {
  message: string;
  /** Present for unexpected errors so the user can report it. */
  requestId: string | null;
}

/**
 * The single translator from errors to Spanish text. Decides by `code`, never by the backend text.
 * Unknown codes fall back to a generic message with the requestId.
 */
export function translateError(error: unknown): ErrorMessage {
  if (isNetworkError(error)) return { message: i18n.t('errors:network'), requestId: null };
  if (isApiError(error)) {
    const key = `errors:codes.${error.code}`;
    if (i18n.exists(key) && error.code !== 'INTERNAL_ERROR') {
      return { message: i18n.t(key as 'errors:codes.BAD_REQUEST'), requestId: error.requestId };
    }
    return {
      message: error.requestId
        ? i18n.t('errors:genericWithId', { requestId: error.requestId })
        : i18n.t('errors:generic'),
      requestId: error.requestId,
    };
  }
  return { message: i18n.t('errors:generic'), requestId: null };
}

// Maps backend validation rule names (class-validator) to field messages.
const CONSTRAINT_MESSAGES: Record<string, string> = {
  isNotEmpty: 'errors:fields.required',
  isDefined: 'errors:fields.required',
  isEmail: 'errors:fields.email',
  minLength: 'errors:fields.tooShort',
  maxLength: 'errors:fields.tooLong',
  min: 'errors:fields.tooSmall',
  max: 'errors:fields.tooLarge',
  isPhoneNumber: 'errors:fields.phone',
  isDateString: 'errors:fields.date',
  isISO8601: 'errors:fields.date',
  isNotCommonPassword: 'errors:fields.weakPassword',
  equals: 'errors:fields.mustBeTrue',
};

/** Turns `VALIDATION_ERROR` details (`[{ field, constraints }]`) into one message per field. */
export function fieldErrorsFrom(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.code !== 'VALIDATION_ERROR') return {};
  const result: Record<string, string> = {};
  for (const detail of error.details) {
    const field = detail.field;
    if (typeof field !== 'string' || result[field]) continue;
    const constraints = Array.isArray(detail.constraints) ? detail.constraints : [];
    const known = constraints.find((c): c is string => typeof c === 'string' && c in CONSTRAINT_MESSAGES);
    result[field] = i18n.t(
      (known ? CONSTRAINT_MESSAGES[known] : 'errors:fields.invalid') as 'errors:fields.invalid',
    );
  }
  return result;
}
