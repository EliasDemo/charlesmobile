import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { BrandImage, Button, Text } from '@/shared/ui';
import { WELCOME_PAGES, useWelcomeStore } from '../hooks/useWelcome';

/**
 * Welcome pages shown the first time the app opens (and again from Profile). A large image block
 * on top (icon illustration until the stock photos arrive), the text right under it, and the
 * actions together at the bottom, away from the corners.
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  const { width, height } = useWindowDimensions();
  const markSeen = useWelcomeStore((s) => s.markSeen);
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<(typeof WELCOME_PAGES)[number]>>(null);
  const last = index === WELCOME_PAGES.length - 1;
  const imageHeight = Math.min(sizes.welcomeImage, height * WELCOME_IMAGE_SHARE);

  const finish = () => {
    markSeen();
    onDone();
  };
  const next = () => {
    if (last) return finish();
    list.current?.scrollToIndex({ index: index + 1 });
    setIndex(index + 1);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ref={list}
        data={WELCOME_PAGES}
        keyExtractor={(page) => page.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <BrandImage imageKeys={[`welcome-${item.key}`]} fallbackIcon={item.icon} height={imageHeight} />
            <View style={styles.texts}>
              <Text variant="display" align="center">
                {t(`pages.${item.key}.title`)}
              </Text>
              <Text color="textSecondary" align="center">
                {t(`pages.${item.key}.text`)}
              </Text>
            </View>
          </View>
        )}
      />
      <View style={styles.bottom}>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('page', { current: index + 1, total: WELCOME_PAGES.length })}
        >
          {WELCOME_PAGES.map((page, i) => (
            <View
              key={page.key}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? theme.colors.primary : theme.colors.border,
                  width: i === index ? spacing.xl : spacing.sm,
                  borderRadius: theme.radius.pill,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.actions}>
          {last ? null : <Button label={t('skip')} variant="ghost" onPress={finish} />}
          <View style={styles.flex}>
            <Button label={last ? t('start') : t('next')} onPress={next} fullWidth />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/** The image never takes more than this share of the screen height (small phones). */
const WELCOME_IMAGE_SHARE = 0.45;

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl },
  texts: { gap: spacing.md },
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
});
