import { router } from 'expo-router';
import { CreateShopScreen, useAppMode } from '@/features/shop-management';

export default function CreateShopRoute() {
  return (
    <CreateShopScreen
      onDone={(shopId) => {
        useAppMode.getState().selectShop(shopId);
        useAppMode.getState().setMode('shop');
        router.replace('/shop');
      }}
    />
  );
}
