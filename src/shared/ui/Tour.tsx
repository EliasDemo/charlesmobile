import { useEffect, useRef, type ReactNode } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
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
  targets: Record<string, Rect>;
  tour: { id: string; steps: TourStep[]; index: number } | null;
  setTarget: (key: string, rect: Rect) => void;
  start: (id: string, steps: TourStep[]) => void;
  next: () => void;
  end: () => void;
}

const useTourStore = create<TourState>((set, get) => ({
  targets: {},
  tour: null,
  setTarget: (key, rect) => set((s) => ({ targets: { ...s.targets, [key]: rect } })),
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

/** Wraps an element the tour can point at (measured on the screen). */
export function TourTarget({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<View>(null);
  const setTarget = useTourStore((s) => s.setTarget);
  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={() =>
        ref.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) setTarget(id, { x, y, width, height });
        })
      }
    >
      {children}
    </View>
  );
}

/**
 * Starts a guided tour the first time a screen is seen (once per device; "Ver el tutorial otra
 * vez" in Ajustes shows them again). Steps whose element is not on screen are skipped.
 */
export function useFirstTimeTour(id: string, steps: { target: string; key: string }[], ns: 'tour') {
  const { t } = useTranslation(ns);
  const seen = useAppSettings((s) => s.toursSeen.includes(id));
  const start = useTourStore((s) => s.start);
  useEffect(() => {
    if (seen) return undefined;
    // Let the screen lay out first, so the targets are measured.
    const timer = setTimeout(() => {
      const targets = useTourStore.getState().targets;
      const available = steps.filter((s) => targets[s.target]);
      if (available.length === 0) return;
      start(
        id,
        available.map((s) => ({
          target: s.target,
          title: t(`${id}.${s.key}.title` as 'explore.search.title'),
          text: t(`${id}.${s.key}.text` as 'explore.search.text'),
        })),
      );
    }, 900);
    return () => clearTimeout(timer);
    // Once per mount of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, id]);
}

const PAD = spacing.xs;

/** The overlay: everything dimmed except the highlighted element, and the explanation. */
export function TourOverlay() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const tour = useTourStore((s) => s.tour);
  const targets = useTourStore((s) => s.targets);
  const next = useTourStore((s) => s.next);
  const end = useTourStore((s) => s.end);
  if (!tour) return null;
  const step = tour.steps[tour.index]!;
  const rect = targets[step.target];
  if (!rect) return null;
  const hole = { x: rect.x - PAD, y: rect.y - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 };
  const below = hole.y + hole.h < height * 0.6;
  const dim = { backgroundColor: theme.colors.backdrop };
  const last = tour.index === tour.steps.length - 1;
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
        <FadeIn
          key={tour.index}
          style={[
            styles.bubble,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderRadius: theme.radius.lg,
              ...(below ? { top: hole.y + hole.h + spacing.md } : { bottom: height - hole.y + spacing.md }),
            },
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

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    padding: spacing.md,
    gap: spacing.xs,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
});
