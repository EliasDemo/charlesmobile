import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { sizes, spacing, useTheme } from '@/shared/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Scrollable content (default). Use false for screens whose lists scroll themselves. */
  scroll?: boolean;
  edges?: Edge[];
}

export function Screen({ children, scroll = true, edges = ['left', 'right', 'bottom'] }: ScreenProps) {
  const theme = useTheme();
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
