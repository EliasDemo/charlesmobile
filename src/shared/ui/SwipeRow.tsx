import { useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Swipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { haptic } from '@/shared/lib';
import { spacing, useTheme, type StatusTone } from '@/shared/theme';
import { Icon, type IconName } from './Icon';
import { TONE_COLORS } from './surface';
import { Text } from './Text';

export interface SwipeAction {
  label: string;
  icon: IconName;
  tone: StatusTone;
  onTrigger: () => void;
}

/**
 * A row that can be swiped to the right (`onSwipeRight`) or to the left (`onSwipeLeft`) as a
 * shortcut. Only for actions that also have a visible button: the gesture is never the only way.
 */
export function SwipeRow({
  children,
  right,
  left,
}: {
  children: ReactNode;
  /** Revealed when swiping to the right. */
  right?: SwipeAction;
  /** Revealed when swiping to the left. */
  left?: SwipeAction;
}) {
  const ref = useRef<SwipeableMethods>(null);
  if (!right && !left) return <>{children}</>;
  return (
    <Swipeable
      ref={ref}
      friction={2}
      leftThreshold={THRESHOLD}
      rightThreshold={THRESHOLD}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={right ? () => <ActionPanel action={right} align="left" /> : undefined}
      renderRightActions={left ? () => <ActionPanel action={left} align="right" /> : undefined}
      onSwipeableOpen={(direction) => {
        // The left panel opens when the row moves to the right, and vice versa.
        const action = direction === SwipeDirection.LEFT ? right : left;
        ref.current?.close();
        if (!action) return;
        haptic(action.tone === 'danger' ? 'warning' : 'success');
        action.onTrigger();
      }}
    >
      {children}
    </Swipeable>
  );
}

const THRESHOLD = 96;

function ActionPanel({ action, align }: { action: SwipeAction; align: 'left' | 'right' }) {
  const theme = useTheme();
  const [bg, fg] = TONE_COLORS[action.tone];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.panel,
        align === 'left' ? styles.alignLeft : styles.alignRight,
        { backgroundColor: theme.colors[bg], borderRadius: theme.radius.lg },
      ]}
    >
      <Icon name={action.icon} size={theme.typography.title.fontSize} color={theme.colors[fg]} />
      <Text variant="label" style={{ color: theme.colors[fg] }}>
        {action.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  alignLeft: { alignItems: 'flex-start' },
  alignRight: { alignItems: 'flex-end' },
});
