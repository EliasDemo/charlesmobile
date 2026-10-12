import { resources } from '..';

/** Every key path of a texts object ("a.b.c"), arrays and plural variants included. */
function keys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe('English texts', () => {
  it.each(Object.keys(resources.es))('%s has the same keys as Spanish', (namespace) => {
    const es = resources.es[namespace as keyof typeof resources.es];
    const en = resources.en[namespace as keyof typeof resources.en];
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });

  it('keeps the same {{placeholders}} in every text', () => {
    const placeholders = (text: string) => (text.match(/\{\{\w+\}\}/g) ?? []).sort();
    const walk = (es: unknown, en: unknown, path: string): string[] => {
      if (typeof es === 'string' && typeof en === 'string') {
        return placeholders(es).join() === placeholders(en).join() ? [] : [path];
      }
      if (es && typeof es === 'object' && en && typeof en === 'object') {
        return Object.keys(es).flatMap((k) =>
          walk((es as Record<string, unknown>)[k], (en as Record<string, unknown>)[k], `${path}.${k}`),
        );
      }
      return [];
    };
    expect(walk(resources.es, resources.en, '')).toEqual([]);
  });
});
