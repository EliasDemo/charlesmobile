import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/shared/theme';
import { Text } from './Text';

/** Title of a tab screen, with an optional action on the right (for example, the notifications bell). */
export function ScreenTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text variant="title" style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
});
