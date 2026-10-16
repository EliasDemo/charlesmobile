import { useMemo } from 'react';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { Animated, StyleSheet, type ColorValue } from 'react-native';
import { useUnreadMessages } from '@/features/messaging';
import { useEffectiveMode } from '@/features/shop-management';
import { useTranslation } from '@/shared/i18n';
import { fontFamily, useTheme } from '@/shared/theme';
import {
  GlassBackground,
  Icon,
  useFadeOnChange,
  usePopWhen,
  useTabAnimation,
  type IconName,
} from '@/shared/ui';

function PoppingIcon({
  name,
  color,
  size,
  focused,
}: {
  name: IconName;
  color: ColorValue;
  size: number;
  focused: boolean;
}) {
  const pop = usePopWhen(focused);
  return (
    <Animated.View style={pop}>
      <Icon name={name} color={color} size={size} />
    </Animated.View>
  );
}

function tabIcon(name: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <PoppingIcon name={name} color={color} size={size} focused={focused} />;
  };
}

/** Stable: a new function on each render would mount the blur again and again. */
const renderTabBarBackground = () => <GlassBackground />;

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const animation = useTabAnimation();
  // Barbershop mode has its own tab set; the hidden tabs stay as routes (href: null).
  const shopMode = useEffectiveMode() === 'shop';
  const unreadMessages = useUnreadMessages();
  const badgeStyle = useMemo(
    () => ({ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary }),
    [theme.colors.primary, theme.colors.onPrimary],
  );
  const client = shopMode ? null : undefined;
  const shop = shopMode ? undefined : null;
  // A hidden tab can still be the current one (the app opens on Explorar, or the mode changed):
  // send each mode to its own first tab.
  const pathname = usePathname();
  const fade = useFadeOnChange(shopMode ? 'shop' : 'client');
  if (shopMode && (pathname === '/' || pathname === '/bookings')) return <Redirect href="/shop" />;
  if (!shopMode && (pathname === '/shop' || pathname === '/agenda')) return <Redirect href="/" />;
  return (
    <Animated.View style={[styles.fill, fade]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          // Floating, translucent bar (glass): content scrolls behind it, with space at the end.
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopColor: theme.colors.border,
            elevation: 0,
          },
          tabBarBackground: renderTabBarBackground,
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
        <Tabs.Screen
          name="messages"
          options={{
            title: t('nav.messages'),
            tabBarIcon: tabIcon('chatbubbles'),
            // The person's own unread conversations (the barbershop side shows them in its list).
            tabBarBadge: !shopMode && unreadMessages > 0 ? unreadMessages : undefined,
            tabBarBadgeStyle: badgeStyle,
          }}
        />
        <Tabs.Screen name="profile" options={{ title: t('nav.profile'), tabBarIcon: tabIcon('person') }} />
      </Tabs>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
