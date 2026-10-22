import { router, useLocalSearchParams } from 'expo-router';
import { NewSaleScreen } from '@/features/business';
import { i18n } from '@/shared/i18n';
import { showToast } from '@/shared/ui';

export default function NewSaleRoute() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  return (
    <NewSaleScreen
      shopId={shopId}
      onDone={(sale) => {
        showToast(i18n.t('business:sale.done'), 'success');
        router.replace({ pathname: '/shop/[shopId]/sales/[saleId]', params: { shopId, saleId: sale.id } });
      }}
      onOpenCash={() => router.push({ pathname: '/shop/[shopId]/cash', params: { shopId } })}
    />
  );
}
