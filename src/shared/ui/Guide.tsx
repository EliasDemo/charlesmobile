import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { useAppSettings } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { guideKey, type GuideId } from './guideIds';
import { Text } from './Text';

export interface GuideStep {
  icon: IconName;
  title: string;
  text: string;
  /** A practical tip under the text ("Ejemplo: …"). */
  tip?: string;
}

export { GUIDE_IDS, guideKey, type GuideId } from './guideIds';

const AUTO_OPEN_DELAY = 600;
const ILLUSTRATION = sizes.cover * 0.7;

/**
 * "¿Cómo funciona?": a banner at the top of a screen that opens a step-by-step guide. The first
 * time the screen is seen it opens by itself (once per device; "Ver el tutorial otra vez" in
 * Ajustes shows them again, like the tours).
 */
export function GuideBanner({
  id,
  title,
  summary,
  icon,
  steps,
}: {
  id: GuideId;
  title: string;
  summary: string;
  icon: IconName;
  steps: GuideStep[];
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const seen = useAppSettings((s) => s.toursSeen.includes(guideKey(id)));
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (seen) return undefined;
    // Let the screen appear first, then explain it.
    const timer = setTimeout(() => setOpen(true), AUTO_OPEN_DELAY);
    return () => clearTimeout(timer);
  }, [seen]);
  const close = () => {
    setOpen(false);
    useAppSettings.getState().markTour(guideKey(id));
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('guide.open', { title })}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.banner,
          { backgroundColor: theme.colors.brand, borderRadius: theme.radius.lg },
          pressed && styles.pressed,
        ]}
        testID={`guide-${id}`}
      >
        <View
          style={[
            styles.bannerIcon,
            { borderColor: theme.colors.brandAccent, borderRadius: theme.radius.pill },
          ]}
        >
          <Icon name={icon} size={sizes.icon} color={theme.colors.brandAccent} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong" color="onBrand" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color="onBrand" numberOfLines={2} style={styles.soft}>
            {summary}
          </Text>
        </View>
        <View
          style={[styles.how, { backgroundColor: theme.colors.brandAccent, borderRadius: theme.radius.pill }]}
        >
          <Icon name="help" size={sizes.icon - spacing.sm} color={theme.colors.brand} />
          <Text variant="caption" style={{ color: theme.colors.brand }}>
            {t('guide.how')}
          </Text>
        </View>
      </Pressable>
      <GuideSheet visible={open} title={title} steps={steps} onClose={close} />
    </>
  );
}

/** The guide itself: one step per page with a big icon, progress dots, Back and Next. */
export function GuideSheet({
  visible,
  title,
  steps,
  onClose,
}: {
  visible: boolean;
  title: string;
  steps: GuideStep[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const finish = () => {
    setIndex(0);
    onClose();
  };
  if (!step) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={finish} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingBottom: spacing.lg + insets.bottom,
              maxHeight: height * 0.9,
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <Text variant="caption" color="primary" style={styles.flex} numberOfLines={1}>
              {`${title} · ${t('guide.step', { n: index + 1, total: steps.length })}`}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('guide.skip')}
              onPress={finish}
              style={styles.close}
            >
              <Icon name="close" size={sizes.icon} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View
              style={[styles.art, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl }]}
            >
              <View
                style={[
                  styles.ring,
                  {
                    borderColor: theme.colors.brandAccent,
                    width: ILLUSTRATION,
                    height: ILLUSTRATION,
                    borderRadius: ILLUSTRATION / 2,
                  },
                ]}
              >
                <Icon name={step.icon} size={ILLUSTRATION * 0.45} color={theme.colors.brandAccent} />
              </View>
              <View
                style={[
                  styles.number,
                  { backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill },
                ]}
              >
                <Text variant="label" color="onPrimary">
                  {String(index + 1)}
                </Text>
              </View>
            </View>
            <Text variant="title" align="center">
              {step.title}
            </Text>
            <Text color="textSecondary" align="center">
              {step.text}
            </Text>
            {step.tip ? (
              <View
                style={[
                  styles.tip,
                  { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
                ]}
              >
                <Icon name="bulb" size={sizes.icon - spacing.xs} color={theme.colors.primary} />
                <Text variant="caption" color="textPrimary" style={styles.flex}>
                  {step.tip}
                </Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.dots} importantForAccessibility="no-hide-descendants">
            {steps.map((s, i) => (
              <View
                key={s.title}
                style={[
                  styles.dot,
                  {
                    borderRadius: theme.radius.pill,
                    width: i === index ? spacing.lg : spacing.sm,
                    backgroundColor: i <= index ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.actions}>
            {index > 0 ? (
              <View style={styles.flex}>
                <Button
                  label={t('guide.back')}
                  variant="secondary"
                  onPress={() => setIndex(index - 1)}
                  fullWidth
                />
              </View>
            ) : null}
            <View style={styles.flex}>
              <Button
                label={last ? t('guide.done') : t('guide.next')}
                icon={last ? 'checkmark' : 'arrow-forward'}
                onPress={last ? finish : () => setIndex(index + 1)}
                fullWidth
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  soft: { opacity: 0.85 },
  pressed: { opacity: 0.9 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  bannerIcon: {
    width: sizes.avatarSmall,
    height: sizes.avatarSmall,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: sizes.borderWidth,
  },
  how: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  close: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  body: { gap: spacing.md, alignItems: 'stretch' },
  art: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  ring: { alignItems: 'center', justifyContent: 'center', borderWidth: sizes.borderWidth * 2 },
  number: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: touchTarget * 0.7,
    height: touchTarget * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { height: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
