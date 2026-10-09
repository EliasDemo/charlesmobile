import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Button, Illustration, Text } from '@/shared/ui';
import { WELCOME_PAGES, useWelcomeStore } from '../hooks/useWelcome';

/**
 * Welcome pages shown the first time the app opens (and again from Profile). Illustrations are
 * icons until the stock photos arrive (M4.5 part 2).
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');
  const { width } = useWindowDimensions();
  const markSeen = useWelcomeStore((s) => s.markSeen);
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<(typeof WELCOME_PAGES)[number]>>(null);
  const last = index === WELCOME_PAGES.length - 1;

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
      <View style={styles.top}>
        <Button label={t('skip')} variant="ghost" onPress={finish} />
      </View>
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
            <Illustration icon={item.icon} />
            <Text variant="display" align="center">
              {t(`pages.${item.key}.title`)}
            </Text>
            <Text color="textSecondary" align="center">
              {t(`pages.${item.key}.text`)}
            </Text>
          </View>
        )}
      />
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
      <View style={styles.bottom}>
        <Button label={last ? t('start') : t('next')} onPress={next} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { alignItems: 'flex-end', paddingHorizontal: spacing.lg },
  page: { flex: 1, justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xxl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  dot: { height: spacing.sm },
  bottom: {
    padding: spacing.lg,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
  },
});
