// Password rules for every form that creates one (register, reset, change). The backend asks for
// 10 to 128 characters and rejects common passwords; the app also asks for a mix of characters.

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

export type PasswordRule = 'length' | 'upper' | 'lower' | 'number' | 'symbol';

export const PASSWORD_RULES: PasswordRule[] = ['length', 'upper', 'lower', 'number', 'symbol'];

const CHECKS: Record<PasswordRule, (password: string) => boolean> = {
  length: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX,
  upper: (p) => /\p{Lu}/u.test(p),
  lower: (p) => /\p{Ll}/u.test(p),
  number: (p) => /\d/.test(p),
  symbol: (p) => /[^\p{L}\d\s]/u.test(p),
};

/** Which rules a password meets, for the live checklist. */
export const passwordChecks = (password: string): Record<PasswordRule, boolean> =>
  Object.fromEntries(PASSWORD_RULES.map((rule) => [rule, CHECKS[rule](password)])) as Record<
    PasswordRule,
    boolean
  >;

export const passwordStrongEnough = (password: string) =>
  PASSWORD_RULES.every((rule) => CHECKS[rule](password));
