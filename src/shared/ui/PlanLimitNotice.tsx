import { usePlanLimit } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { ConfirmDialog } from './ConfirmDialog';

/** The sheet shown when an action hits the plan's limit, with "Ver mi plan". */
export function PlanLimitNotice({ onSeePlan }: { onSeePlan: () => void }) {
  const { t } = useTranslation('plans');
  const hit = usePlanLimit((s) => s.hit);
  const close = usePlanLimit((s) => s.close);
  return (
    <ConfirmDialog
      visible={hit !== null}
      title={t('limitTitle')}
      message={hit?.kind === 'feature' ? t('featureMessage') : t('limitMessage')}
      confirmLabel={t('seeMyPlan')}
      icon="rocket"
      onConfirm={() => {
        close();
        onSeePlan();
      }}
      onCancel={close}
    />
  );
}
