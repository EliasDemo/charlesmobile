import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
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
      <Tabs.Screen name="index" options={{ title: t('nav.explore'), tabBarIcon: tabIcon('search') }} />
      <Tabs.Screen name="bookings" options={{ title: t('nav.bookings'), tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile'), tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
