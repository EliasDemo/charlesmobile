import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useTranslation } from '@/shared/i18n';
import { useAppSettings } from '@/shared/lib';
import { spacing, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { FadeIn } from './motion';
import { Text } from './Text';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourStep {
  target: string;
  title: string;
  text: string;
}

interface TourState {
  targets: Record<string, RefObject<View | null>>;
  tour: { id: string; steps: TourStep[]; index: number } | null;
  register: (key: string, ref: RefObject<View | null>) => void;
  unregister: (key: string, ref: RefObject<View | null>) => void;
  start: (id: string, steps: TourStep[]) => void;
  next: () => void;
  end: () => void;
}

const useTourStore = create<TourState>((set, get) => ({
  targets: {},
  tour: null,
  register: (key, ref) => set((s) => ({ targets: { ...s.targets, [key]: ref } })),
  unregister: (key, ref) =>
    set((s) => {
      if (s.targets[key] !== ref) return s;
      const targets = { ...s.targets };
      delete targets[key];
      return { targets };
    }),
  start: (id, steps) => set({ tour: { id, steps, index: 0 } }),
  next: () => {
    const tour = get().tour;
    if (!tour) return;
    if (tour.index + 1 >= tour.steps.length) get().end();
    else set({ tour: { ...tour, index: tour.index + 1 } });
  },
  end: () => {
    const tour = get().tour;
    if (tour) useAppSettings.getState().markTour(tour.id);
    set({ tour: null });
  },
}));

/** Measures a target where it is now (it may have moved since it was laid out). */
function measure(ref: RefObject<View | null> | undefined): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!ref?.current) return resolve(null);
    ref.current.measureInWindow((x, y, width, height) =>
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null),
    );
  });
}

/** Fully on screen (a chip scrolled out of a row is not: the step is skipped, not pointed at the void). */
function visible(rect: Rect, width: number, height: number) {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height;
}

/** Wraps an element the tour can point at. It is measured when its step is shown. */
export function TourTarget({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<View>(null);
  const register = useTourStore((s) => s.register);
  const unregister = useTourStore((s) => s.unregister);
  useEffect(() => {
    register(id, ref);
    return () => unregister(id, ref);
  }, [id, register, unregister]);
  return (
    <View ref={ref} collapsable={false}>
      {children}
    </View>
  );
}

/**
 * Starts a guided tour the first time a screen is seen (once per device; "Ver el tutorial otra
 * vez" in Ajustes shows them again). Steps whose element is not fully on screen are skipped.
 */
export function useFirstTimeTour(id: string, steps: { target: string; key: string }[], ns: 'tour') {
  const { t } = useTranslation(ns);
  const seen = useAppSettings((s) => s.toursSeen.includes(id));
  const start = useTourStore((s) => s.start);
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (seen) return undefined;
    let cancelled = false;
    // Let the screen lay out and load first, so the targets are where they will stay.
    const timer = setTimeout(async () => {
      const targets = useTourStore.getState().targets;
      const rects = await Promise.all(steps.map((s) => measure(targets[s.target])));
      const available = steps.filter((_, i) => {
        const rect = rects[i];
        return rect ? visible(rect, width, height) : false;
      });
      if (cancelled || available.length === 0 || useTourStore.getState().tour) return;
      start(
        id,
        available.map((s) => ({
          target: s.target,
          title: t(`${id}.${s.key}.title` as 'explore.search.title'),
          text: t(`${id}.${s.key}.text` as 'explore.search.text'),
        })),
      );
    }, START_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Once per mount of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, id]);
}

const START_DELAY = 1200;
const PAD = spacing.xs;

/** The overlay: everything dimmed except the highlighted element, and the explanation beside it. */
export function TourOverlay() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const tour = useTourStore((s) => s.tour);
  const next = useTourStore((s) => s.next);
  const end = useTourStore((s) => s.end);
  const [rect, setRect] = useState<{ key: string; rect: Rect | null } | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(0);
  const step = tour ? tour.steps[tour.index] : undefined;
  const stepKey = tour && step ? `${tour.id}:${tour.index}` : null;

  // Measure the target of each step when it is shown; if it is gone, go on.
  useEffect(() => {
    if (!step || !stepKey) return undefined;
    let cancelled = false;
    void measure(useTourStore.getState().targets[step.target]).then((measured) => {
      if (cancelled) return;
      if (!measured || !visible(measured, width, height)) next();
      else setRect({ key: stepKey, rect: measured });
    });
    return () => {
      cancelled = true;
    };
  }, [step, stepKey, width, height, next]);

  if (!tour || !step || rect?.key !== stepKey || !rect.rect) return null;
  const r = rect.rect;
  const hole = { x: r.x - PAD, y: r.y - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
  const spaceBelow = height - insets.bottom - (hole.y + hole.h);
  const spaceAbove = hole.y - insets.top;
  // Beside the element, on the side with room; never over it.
  const below = spaceBelow >= spaceAbove;
  const bubbleTop = below
    ? hole.y + hole.h + spacing.md
    : Math.max(insets.top + spacing.sm, hole.y - spacing.md - bubbleHeight);
  const arrowLeft = Math.min(
    Math.max(hole.x + hole.w / 2 - ARROW, spacing.gutter + spacing.md),
    width - spacing.gutter - spacing.md - ARROW * 2,
  );
  const dim = { backgroundColor: theme.colors.backdrop };
  const last = tour.index === tour.steps.length - 1;
  const bubbleColor = theme.colors.surfaceElevated;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={end} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <View style={[dim, { position: 'absolute', left: 0, top: 0, width, height: Math.max(0, hole.y) }]} />
        <View style={[dim, { position: 'absolute', left: 0, top: hole.y + hole.h, width, bottom: 0 }]} />
        <View
          style={[
            dim,
            { position: 'absolute', left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h },
          ]}
        />
        <View
          style={[
            dim,
            { position: 'absolute', left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h },
          ]}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: hole.x,
            top: hole.y,
            width: hole.w,
            height: hole.h,
            borderRadius: theme.radius.lg,
            borderWidth: 2,
            borderColor: theme.colors.primary,
          }}
        />
        <View
          pointerEvents="none"
          style={[
            styles.arrow,
            {
              left: arrowLeft,
              ...(below
                ? { top: bubbleTop - ARROW, borderBottomColor: bubbleColor }
                : { top: bubbleTop + bubbleHeight, borderTopColor: bubbleColor }),
            },
          ]}
        />
        <FadeIn
          key={tour.index}
          onLayout={(e) => setBubbleHeight(e.nativeEvent.layout.height)}
          style={[
            styles.bubble,
            { top: bubbleTop, backgroundColor: bubbleColor, borderRadius: theme.radius.lg },
          ]}
        >
          <Text variant="caption" color="primary">
            {t('tour.step', { current: tour.index + 1, total: tour.steps.length })}
          </Text>
          <Text variant="subtitle">{step.title}</Text>
          <Text color="textSecondary">{step.text}</Text>
          <View style={styles.actions}>
            {last ? null : <Button label={t('tour.skip')} variant="ghost" onPress={end} />}
            <View style={styles.flex}>
              <Button label={last ? t('tour.done') : t('tour.next')} onPress={next} fullWidth />
            </View>
          </View>
        </FadeIn>
      </View>
    </Modal>
  );
}

const ARROW = spacing.sm;

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    padding: spacing.md,
    gap: spacing.xs,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderTopWidth: ARROW,
    borderBottomWidth: ARROW,
    borderColor: 'transparent',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
});
