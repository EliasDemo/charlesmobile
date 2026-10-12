import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Button, DateSelector, Notice, QueryView, Screen, SegmentedControl, TextField } from '@/shared/ui';
import type { ManagedShop } from '../api/shopApi';
import { useManagedShop } from '../hooks/useManagedShop';
import { LIMITS } from '../schemas/limits';
import { useShopStatus } from '../hooks/useShopStatus';

export function ShopStatusScreen({ shopId, onSaved }: { shopId: string; onSaved: () => void }) {
  const shop = useManagedShop(shopId);
  return (
    <Screen>
      <QueryView query={shop}>{(data) => <StatusForm shop={data} onSaved={onSaved} />}</QueryView>
    </Screen>
  );
}

function StatusForm({ shop, onSaved }: { shop: ManagedShop; onSaved: () => void }) {
  const { t } = useTranslation('shop');
  const s = useShopStatus(shop, { onSaved });
  return (
    <View style={styles.content}>
      <SegmentedControl
        label={t('statusForm.title')}
        hideLabel
        value={s.closed ? 'closed' : 'open'}
        onChange={(v) => s.setClosed(v === 'closed')}
        options={[
          { value: 'open', label: t('statusForm.open') },
          { value: 'closed', label: t('statusForm.closed') },
        ]}
      />
      {s.closed ? (
        <>
          <Notice tone="warning" message={t('statusForm.explainClosed')} />
          <TextField
            label={t('statusForm.reason')}
            value={s.reason}
            onChangeText={s.setReason}
            maxLength={LIMITS.closureReason.max}
            error={s.reasonError ? t(s.reasonError) : undefined}
          />
          <DateSelector
            label={t('statusForm.reopen')}
            days={s.days}
            selected={s.reopenDate}
            onSelect={s.setReopenDate}
          />
        </>
      ) : null}
      {s.error ? <Notice tone="danger" message={s.error} /> : null}
      <Button label={t('statusForm.save')} onPress={s.save} loading={s.isSaving} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
});
