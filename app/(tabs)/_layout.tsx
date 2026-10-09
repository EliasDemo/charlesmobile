import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useEffectiveMode } from '@/features/shop-management';
import { useTranslation } from '@/shared/i18n';
import { fontFamily, useTheme } from '@/shared/theme';
import { Icon, useTabAnimation, type IconName } from '@/shared/ui';

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const animation = useTabAnimation();
  // Barbershop mode has its own tab set; the hidden tabs stay as routes (href: null).
  const shopMode = useEffectiveMode() === 'shop';
  const client = shopMode ? null : undefined;
  const shop = shopMode ? undefined : null;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontFamily: fontFamily.medium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: client, title: t('nav.explore'), tabBarIcon: tabIcon('search') }}
      />
      <Tabs.Screen
        name="shop"
        options={{ href: shop, title: t('nav.shop'), tabBarIcon: tabIcon('storefront') }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ href: shop, title: t('nav.agenda'), tabBarIcon: tabIcon('today') }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ href: client, title: t('nav.bookings'), tabBarIcon: tabIcon('calendar') }}
      />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile'), tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
