import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { sizes, spacing, useTheme } from '@/shared/theme';
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
  const content = (
    <View style={[styles.content, tabBar ? { paddingBottom: spacing.lg + tabBar } : null]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        <ScrollView
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
