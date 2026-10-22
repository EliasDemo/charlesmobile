import { useEffect, useRef, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { keyboardController, useKeyboardHeight } from './keyboard';
import { useTabBarSpace } from './tabBarSpace';

export interface ScreenProps {
  children: ReactNode;
  /** Scrollable content (default). Use false for screens whose lists scroll themselves. */
  scroll?: boolean;
  edges?: Edge[];
  /** Pull to refresh (scrollable screens only). */
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scroll = true,
  edges = ['left', 'right', 'bottom'],
  refreshing = false,
  onRefresh,
}: ScreenProps) {
  const theme = useTheme();
  const tabBar = useTabBarSpace();
  // With the keyboard library (once compiled) it scrolls to the field by itself; until then, by hand.
  const aware = keyboardController()?.KeyboardAwareScrollView;
  const measured = useKeyboardHeight();
  const keyboard = aware ? 0 : measured;
  const scrollRef = useRef<ScrollView>(null);
  // The keyboard must never cover the field being typed in: room at the end, and scroll to it.
  useEffect(() => {
    if (!scroll || keyboard === 0) return undefined;
    const timer = setTimeout(() => {
      const input = TextInput.State.currentlyFocusedInput();
      if (input) scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(input, KEYBOARD_GAP, true);
    }, KEYBOARD_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [scroll, keyboard]);
  const bottom = keyboard > 0 ? keyboard + spacing.lg : tabBar ? spacing.lg + tabBar : null;
  const common = {
    keyboardDismissMode: 'interactive' as const,
    contentContainerStyle: styles.scroll,
    keyboardShouldPersistTaps: 'handled' as const,
    refreshControl: onRefresh ? (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={theme.colors.primary}
        colors={[theme.colors.primary]}
      />
    ) : undefined,
  };
  const content = (
    <View style={[styles.content, bottom !== null ? { paddingBottom: bottom } : null]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        aware ? (
          <AwareScroll Component={aware} common={common}>
            {content}
          </AwareScroll>
        ) : (
          <ScrollView ref={scrollRef} {...common}>
            {content}
          </ScrollView>
        )
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

type AwareComponent = NonNullable<ReturnType<typeof keyboardController>>['KeyboardAwareScrollView'];

function AwareScroll({
  Component,
  common,
  children,
}: {
  Component: AwareComponent;
  common: ScrollViewProps;
  children: ReactNode;
}) {
  return (
    <Component bottomOffset={KEYBOARD_GAP} {...common}>
      {children}
    </Component>
  );
}

/** Space between the focused field and the keyboard (room for its error line). */
const KEYBOARD_GAP = spacing.xxxl * 2;
const KEYBOARD_SETTLE_MS = 50;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: sizes.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
});
