import type { TFunction } from 'i18next';
import { formatMoney, parseSoles } from '@/shared/lib';

export type PayPeriod = 'MONTH' | 'WEEK' | 'DAY' | 'SERVICE';
export type SelectionProcess = 'INTERVIEW' | 'TRIAL' | 'DIRECT';

/** What the wizard asks beyond the contract's fields (they travel inside its text fields). */
export interface OfferExtras {
  amount: string;
  period: PayPeriod;
  commission: string;
  negotiable: boolean;
  requirements: string[];
  process: SelectionProcess;
  about: string;
}

/**
 * Pay, "conversable", requirements and the selection process written into `compensationText`
 * (max. 120) and `description`, until the backend has fields for them.
 */
export function composeOffer(e: OfferExtras, t: TFunction<'jobs'>) {
  const cents = parseSoles(e.amount);
  const pay = [
    cents !== null
      ? t('wizard.payLine', {
          amount: formatMoney({ amount: cents, currency: 'PEN' }),
          period: t(`wizard.periods.${e.period}`),
        })
      : null,
    e.commission ? t('wizard.commissionLine', { percent: e.commission }) : null,
    e.negotiable ? t('wizard.negotiableShort') : null,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 120);
  const requirements = e.requirements.map((r) => r.trim()).filter(Boolean);
  const description = [
    e.about.trim(),
    requirements.length
      ? `${t('wizard.requirementsTitle')}\n${requirements.map((r) => `• ${r}`).join('\n')}`
      : '',
    `${t('wizard.processTitle')} ${t(`wizard.processes.${e.process}`)}`,
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 2000);
  return { compensationText: pay, description };
}
