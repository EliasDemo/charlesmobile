import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { BrandImage, Button, Icon, Text, useReduceMotion, type IconName } from '@/shared/ui';
import { WELCOME_PAGES, useWelcomeStore, type WelcomeChoice } from '../hooks/useWelcome';

/** The image never takes more than this share of the screen height (small phones). */
const IMAGE_SHARE = 0.42;

/**
 * Welcome, shown the first time (and again from Ajustes): pages with a soft gradient each, the
 * illustration moving at another speed than the text (parallax), animated progress, and a last
 * page to choose how to use Charles. Motion respects "reduce motion".
 */
export function WelcomeScreen({ onDone }: { onDone: (choice: WelcomeChoice) => void }) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const markSeen = useWelcomeStore((s) => s.markSeen);
  const scrollX = useSharedValue(0);
  const list = useRef<Animated.FlatList<(typeof WELCOME_PAGES)[number]>>(null);
  const [index, setIndex] = useState(0);
  const pages = WELCOME_PAGES.length;
  const last = index === pages;
  const imageHeight = Math.min(sizes.welcomeImage, height * IMAGE_SHARE);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const finish = (choice: WelcomeChoice) => {
    markSeen();
    onDone(choice);
  };
  const goTo = (i: number) => {
    list.current?.scrollToIndex({ index: i, animated: !reduce });
    setIndex(i);
  };

  // The pages plus the final "choose" page.
  const data = [...WELCOME_PAGES, { key: 'choose', icon: 'sparkles' as IconName }];
  const gradients = [
    theme.colors.primarySoft,
    theme.colors.statusSuccessBg,
    theme.colors.statusPendingBg,
    theme.colors.primarySoft,
    theme.colors.background,
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[gradients[Math.min(index, gradients.length - 1)]!, theme.colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.FlatList
        ref={list}
        data={data}
        keyExtractor={(page) => page.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) =>
          item.key === 'choose' ? (
            <View style={[styles.page, { width }]}>
              <Text variant="display" align="center">
                {t('choose.title')}
              </Text>
              <Text color="textSecondary" align="center">
                {t('choose.text')}
              </Text>
              <ChoiceCard
                icon="calendar"
                title={t('choose.client')}
                text={t('choose.clientText')}
                onPress={() => finish('client')}
              />
              <ChoiceCard
                icon="storefront"
                title={t('choose.shop')}
                text={t('choose.shopText')}
                onPress={() => finish('shop')}
              />
              <ChoiceCard
                icon="cut"
                title={t('choose.barber')}
                text={t('choose.barberText')}
                onPress={() => finish('barber')}
              />
            </View>
          ) : (
            <Page index={i} width={width} scrollX={scrollX} reduce={reduce}>
              <View
                style={[
                  styles.arch,
                  {
                    height: imageHeight,
                    borderTopLeftRadius: imageHeight,
                    borderTopRightRadius: imageHeight,
                    borderBottomLeftRadius: theme.radius.xl,
                    borderBottomRightRadius: theme.radius.xl,
                    borderColor: theme.colors.accentText,
                  },
                ]}
              >
                <BrandImage
                  imageKeys={[`welcome-${item.key}`]}
                  fallbackIcon={item.icon}
                  height={imageHeight}
                />
              </View>
              <View style={styles.texts}>
                <Text variant="display" align="center">
                  {t(`pages.${item.key as (typeof WELCOME_PAGES)[number]['key']}.title`)}
                  {'\n'}
                  <Text variant="display" color="accentText">
                    {t(`pages.${item.key as (typeof WELCOME_PAGES)[number]['key']}.titleAccent`)}
                  </Text>
                </Text>
                <Text color="textSecondary" align="center">
                  {t(`pages.${item.key as (typeof WELCOME_PAGES)[number]['key']}.text`)}
                </Text>
              </View>
            </Page>
          )
        }
      />
      <View style={styles.bottom}>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('page', { current: index + 1, total: pages + 1 })}
        >
          {data.map((page, i) => (
            <Dot key={page.key} i={i} width={width} scrollX={scrollX} />
          ))}
        </View>
        {last ? null : (
          <View style={styles.actions}>
            <Button label={t('skip')} variant="ghost" onPress={() => goTo(pages)} />
            <View style={styles.flex}>
              <Button label={t('next')} onPress={() => goTo(index + 1)} fullWidth />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/** A page whose image moves slower than the swipe and fades in/out (parallax). */
function Page({
  index,
  width,
  scrollX,
  reduce,
  children,
}: {
  index: number;
  width: number;
  scrollX: SharedValue<number>;
  reduce: boolean;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    if (reduce) return {};
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(scrollX.value, input, [width * 0.3, 0, -width * 0.3], Extrapolation.CLAMP),
        },
        { scale: interpolate(scrollX.value, input, [0.9, 1, 0.9], Extrapolation.CLAMP) },
      ],
    };
  });
  return <Animated.View style={[styles.page, { width }, style]}>{children}</Animated.View>;
}

/** The progress dot stretches as its page comes in. */
function Dot({ i, width, scrollX }: { i: number; width: number; scrollX: SharedValue<number> }) {
  const theme = useTheme();
  const style = useAnimatedStyle(() => {
    const input = [(i - 1) * width, i * width, (i + 1) * width];
    return {
      width: interpolate(scrollX.value, input, [spacing.sm, spacing.xl, spacing.sm], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, input, [0.4, 1, 0.4], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill }, style]}
    />
  );
}

function ChoiceCard({
  icon,
  title,
  text,
  onPress,
}: {
  icon: IconName;
  title: string;
  text: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: theme.colors.surface,
          borderColor: pressed ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View
        style={[
          styles.choiceIcon,
          { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
        ]}
      >
        <Icon name={icon} size={sizes.icon * 1.4} color={theme.colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {text}
        </Text>
      </View>
      <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  texts: { gap: spacing.md },
  arch: { overflow: 'hidden', borderWidth: 2, width: '86%', alignSelf: 'center' },
  bottom: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { height: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: sizes.borderWidth,
  },
  choiceIcon: {
    width: sizes.avatarSmall,
    height: sizes.avatarSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
