import type { TFunction } from 'i18next';
import { parseSoles } from '@/shared/lib';
import type { CreateJobBody } from '../api/jobsApi';

export type PayPeriod = 'MONTH' | 'WEEK' | 'DAY' | 'SERVICE';
export type SelectionProcess = 'INTERVIEW' | 'TRIAL' | 'DIRECT';

/** What the wizard asks beyond title, type and styles. */
export interface OfferExtras {
  amount: string;
  period: PayPeriod;
  commission: string;
  negotiable: boolean;
  requirements: string[];
  process: SelectionProcess;
  about: string;
}

const PERIOD: Record<PayPeriod, NonNullable<CreateJobBody['payPeriod']>> = {
  MONTH: 'MONTH',
  WEEK: 'WEEK',
  DAY: 'DAY',
  SERVICE: 'PER_SERVICE',
};

/**
 * The offer in the contract's own fields: pay (céntimos), type and period, "negociable",
 * requirements, selection process and description. The commission percentage has no field of its
 * own, so it travels in `compensationText` ("Comisión 40 %").
 */
export function offerFields(e: OfferExtras, t: TFunction<'jobs'>) {
  const cents = parseSoles(e.amount);
  const commission = e.commission.trim();
  const payType: CreateJobBody['payType'] =
    e.period === 'SERVICE'
      ? 'PER_SERVICE'
      : cents !== null && commission
        ? 'MIXED'
        : commission
          ? 'COMMISSION'
          : cents !== null
            ? 'FIXED'
            : null;
  const requirements = e.requirements
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, REQUIREMENTS_MAX);
  return {
    description: e.about.trim(),
    compensationText: commission ? t('wizard.commissionLine', { percent: commission }) : '',
    ...(cents !== null ? { payMin: cents, payMax: cents, payPeriod: PERIOD[e.period] } : {}),
    ...(payType ? { payType } : {}),
    negotiable: e.negotiable,
    requirements,
    selectionProcess: e.process,
  } satisfies Partial<CreateJobBody>;
}

/** The contract allows up to 20 requirements. */
export const REQUIREMENTS_MAX = 20;
