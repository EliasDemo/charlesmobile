import { useEffect, useMemo } from 'react';
import { Redirect, Tabs, router, usePathname, type Href } from 'expo-router';
import { Animated, StyleSheet, type ColorValue } from 'react-native';
import { useUnreadMessages } from '@/features/messaging';
import { useEffectiveMode, useShopHome } from '@/features/shop-management';
import { useTranslation } from '@/shared/i18n';
import { fontFamily, useTheme } from '@/shared/theme';
import {
  GlassBackground,
  Icon,
  showUnlocked,
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

/** The first time in barbershop mode: what opened, with a shortcut to each function. */
function useShopModeUnlock(shopMode: boolean) {
  const { t } = useTranslation();
  const home = useShopHome();
  const loaded = home.mine.data !== undefined;
  const manages = home.shops.length > 0;
  useEffect(() => {
    if (!shopMode || !loaded) return;
    const go = (href: Href) => () => router.navigate(href);
    showUnlocked(
      manages
        ? {
            id: 'unlock.mode.owner',
            title: t('unlock.owner.title'),
            text: t('unlock.owner.text'),
            items: [
              {
                icon: 'storefront',
                title: t('unlock.owner.panel'),
                text: t('unlock.owner.panelText'),
                onPress: go('/shop'),
              },
              {
                icon: 'today',
                title: t('unlock.owner.agenda'),
                text: t('unlock.owner.agendaText'),
                onPress: go('/agenda'),
              },
              {
                icon: 'chatbubbles',
                title: t('unlock.owner.messages'),
                text: t('unlock.owner.messagesText'),
                onPress: go('/messages'),
              },
            ],
          }
        : {
            id: 'unlock.mode.barber',
            title: t('unlock.barber.title'),
            text: t('unlock.barber.text'),
            items: [
              {
                icon: 'briefcase',
                title: t('unlock.barber.jobs'),
                text: t('unlock.barber.jobsText'),
                onPress: go('/jobs'),
              },
              {
                icon: 'today',
                title: t('unlock.barber.agenda'),
                text: t('unlock.barber.agendaText'),
                onPress: go('/agenda'),
              },
              {
                icon: 'person-circle',
                title: t('unlock.barber.career'),
                text: t('unlock.barber.careerText'),
                onPress: go('/career'),
              },
              {
                icon: 'chatbubbles',
                title: t('unlock.barber.messages'),
                text: t('unlock.barber.messagesText'),
                onPress: go('/messages'),
              },
            ],
          },
    );
  }, [shopMode, loaded, manages, t]);
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
  useShopModeUnlock(shopMode);
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
          name="community"
          options={{ title: t('nav.community'), tabBarIcon: tabIcon('people') }}
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
