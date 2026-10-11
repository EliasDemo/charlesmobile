import { StyleSheet, View, type ViewProps } from 'react-native';
import { spacing } from '@/shared/theme';
import { useSurfaceStyle } from './surface';

export function Card({ style, ...props }: ViewProps) {
  const surface = useSurfaceStyle();
  return <View style={[styles.card, surface, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm },
});
