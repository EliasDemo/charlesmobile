import { router } from 'expo-router';
import { CreateShopScreen, useAppMode } from '@/features/shop-management';
import { i18n } from '@/shared/i18n';
import { showUnlocked } from '@/shared/ui';

type CreatedKey =
  | 'title'
  | 'text'
  | 'hours'
  | 'hoursText'
  | 'services'
  | 'servicesText'
  | 'barbers'
  | 'barbersText'
  | 'open'
  | 'openText';

export default function CreateShopRoute() {
  return (
    <CreateShopScreen
      onDone={(shopId) => {
        useAppMode.getState().selectShop(shopId);
        useAppMode.getState().setMode('shop');
        router.replace('/shop');
        const open = (section: 'hours' | 'services' | 'barbers' | 'status') => () =>
          router.push({ pathname: `/shop/[shopId]/${section}`, params: { shopId } });
        const t = (key: CreatedKey) => i18n.t(`common:unlock.created.${key}`);
        showUnlocked({
          id: `unlock.created.${shopId}`,
          title: t('title'),
          text: t('text'),
          items: [
            { icon: 'time', title: t('hours'), text: t('hoursText'), onPress: open('hours') },
            { icon: 'cut', title: t('services'), text: t('servicesText'), onPress: open('services') },
            { icon: 'people', title: t('barbers'), text: t('barbersText'), onPress: open('barbers') },
            { icon: 'power', title: t('open'), text: t('openText'), onPress: open('status') },
          ],
        });
      }}
    />
  );
}
