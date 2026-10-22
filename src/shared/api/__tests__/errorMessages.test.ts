import { ApiError, NetworkError, apiErrorFromResponse, isApiError, retryAfterSeconds } from '../errors';
import { fieldErrorsFrom, translateError } from '../errorMessages';
import errorsEs from '../../i18n/locales/es/errors.json';

const error = (code: string, details: Record<string, unknown>[] = [], requestId = 'req-9') =>
  new ApiError(400, { code, message: 'texto del backend', details, requestId });

describe('translateError', () => {
  it('translates by code, never by the backend text', () => {
    expect(translateError(error('SLOT_NOT_AVAILABLE')).message).toBe(errorsEs.codes.SLOT_NOT_AVAILABLE);
    expect(translateError(error('INVALID_CREDENTIALS')).message).toBe(
      'Usuario, correo o contraseña incorrectos.',
    );
  });

  it('has a Spanish text for every code documented in the API guide', () => {
    // INTERNAL_ERROR deliberately shows the requestId so the user can report it.
    for (const code of Object.keys(errorsEs.codes).filter((c) => c !== 'INTERNAL_ERROR')) {
      expect(translateError(error(code)).message).not.toContain('req-9');
    }
  });

  it('shows a generic message with the requestId for unknown codes', () => {
    const result = translateError(error('SOMETHING_NEW'));
    expect(result.message).toContain('req-9');
    expect(result.requestId).toBe('req-9');
  });

  it('includes the requestId on internal errors', () => {
    expect(translateError(error('INTERNAL_ERROR')).message).toContain('req-9');
  });

  it('uses a generic message without requestId when there is none', () => {
    const result = translateError(new ApiError(500, null));
    expect(result.message).toBe(errorsEs.generic);
  });

  it('explains network failures', () => {
    expect(translateError(new NetworkError()).message).toBe(errorsEs.network);
  });

  it('handles unexpected values', () => {
    expect(translateError(new Error('boom')).message).toBe(errorsEs.generic);
  });
});

describe('fieldErrorsFrom', () => {
  it('maps validation details to one message per field', () => {
    const result = fieldErrorsFrom(
      error('VALIDATION_ERROR', [
        { field: 'email', constraints: ['isEmail'] },
        { field: 'password', constraints: ['minLength', 'isNotCommonPassword'] },
        { field: 'password', constraints: ['maxLength'] },
        { field: 'phone', constraints: ['somethingNew'] },
        { constraints: ['isEmail'] },
      ]),
    );
    expect(result).toEqual({
      email: errorsEs.fields.email,
      password: errorsEs.fields.tooShort,
      phone: errorsEs.fields.invalid,
    });
  });

  it('ignores errors that are not validation errors', () => {
    expect(fieldErrorsFrom(error('CONFLICT'))).toEqual({});
    expect(fieldErrorsFrom(new Error('x'))).toEqual({});
  });
});

describe('ApiError helpers', () => {
  it('reads the error body and the X-Request-Id header', async () => {
    const response = new Response(
      JSON.stringify({ code: 'NOT_FOUND', message: 'x', details: [], requestId: 'b' }),
      {
        status: 404,
      },
    );
    const parsed = await apiErrorFromResponse(response);
    expect(parsed).toMatchObject({ status: 404, code: 'NOT_FOUND', requestId: 'b' });
    expect(isApiError(parsed)).toBe(true);

    const noBody = await apiErrorFromResponse(
      new Response('oops', { status: 502, headers: { 'X-Request-Id': 'h' } }),
    );
    expect(noBody).toMatchObject({ code: 'UNKNOWN', requestId: 'h', details: [] });
  });

  it('reads the wait time from details or from Retry-After', () => {
    expect(retryAfterSeconds(error('ACCOUNT_LOCKED', [{ retryAfterSeconds: 60 }]))).toBe(60);
    const header = new Response(null, { status: 429, headers: { 'Retry-After': '5' } });
    expect(retryAfterSeconds(error('TOO_MANY_REQUESTS'), header)).toBe(5);
    expect(retryAfterSeconds(error('TOO_MANY_REQUESTS'))).toBeNull();
  });
});
