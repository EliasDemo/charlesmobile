import { i18n } from '@/shared/i18n';
import { jobPayText } from '../components/JobParts';

const t = i18n.getFixedT('es', 'jobs');
const job = (o: object) =>
  ({ payMin: null, payMax: null, payPeriod: null, payType: null, negotiable: false, ...o }) as never;

describe('jobPayText', () => {
  it('shows the range, period, type and "negociable" as the API gives them', () => {
    const text = jobPayText(
      job({ payMin: 120000, payMax: 180000, payPeriod: 'MONTH', payType: 'MIXED', negotiable: true }),
      t,
    );
    expect(text).toMatch(/1[.,]?200/);
    expect(text).toContain('al mes');
    expect(text).toContain('Fijo + comisión');
    expect(text).toContain('Negociable');
  });

  it('is null when the posting says nothing about pay', () => {
    expect(jobPayText(job({}), t)).toBeNull();
  });
});
