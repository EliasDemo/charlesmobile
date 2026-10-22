import { useEffect, useRef, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { useKeyboardHeight } from './keyboard';
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
  const keyboard = useKeyboardHeight();
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
  const content = (
    <View style={[styles.content, bottom !== null ? { paddingBottom: bottom } : null]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
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
