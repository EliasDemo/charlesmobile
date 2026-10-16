import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { useTranslation, type resources } from '@/shared/i18n';
import { fieldErrorsFrom, translateError } from '@/shared/api';

/**
 * Shows a backend error in a form: VALIDATION_ERROR details go next to their fields, anything
 * else (or fields the form does not have) becomes the general message that is returned.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const byField = fieldErrorsFrom(error);
  let unmatched = Object.keys(byField).length === 0;
  for (const [field, message] of Object.entries(byField)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: true });
    } else {
      unmatched = true;
    }
  }
  return unmatched ? translateError(error).message : null;
}

/**
 * Text for a field error: client rules store an i18n key of the given namespace, server errors
 * arrive already translated (applyServerErrors). Unknown keys are shown as they are.
 */
export function useFieldErrorText(namespace: keyof (typeof resources)['es']) {
  const { t } = useTranslation(namespace);
  return (message: string | undefined): string | undefined =>
    message ? (t(message as never, { defaultValue: message }) as string) : undefined;
}

/** Spanish text for any error (re-exported for screens, which must not import @/shared/api). */
export const translateErrorMessage = (error: unknown): string => translateError(error).message;
