import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon, Text, type IconName } from '@/shared/ui';

/** Text tabs with an underline on the selected one (Para ti · Cerca · Siguiendo). */
export function FeedTabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[styles.tabs, { borderBottomColor: theme.colors.border }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={styles.tab}
          >
            <Text
              variant={selected ? 'bodyStrong' : 'body'}
              color={selected ? 'textPrimary' : 'textSecondary'}
            >
              {o.label}
            </Text>
            <View
              style={[
                styles.underline,
                {
                  backgroundColor: selected ? theme.colors.primary : 'transparent',
                  borderRadius: theme.radius.pill,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/** One sliding row of small pills with an icon; it runs from edge to edge of the screen. */
export function TypeFilter<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  options: { value: T | undefined; label: string; icon: IconName }[];
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.pills}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value ?? 'all'}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={styles.pillTouch}
          >
            <View
              style={[
                styles.pill,
                {
                  borderRadius: theme.radius.pill,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                },
              ]}
            >
              <Icon
                name={o.icon}
                size={sizes.icon - spacing.xs}
                color={selected ? theme.colors.onPrimary : theme.colors.textSecondary}
              />
              <Text variant="label" color={selected ? 'onPrimary' : 'textPrimary'}>
                {o.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: touchTarget, gap: spacing.xs },
  underline: { height: spacing.xs - 1, alignSelf: 'stretch', marginHorizontal: spacing.lg },
  // Bleeds over the screen's side margin so no pill looks cut at the edges.
  bar: { flexGrow: 0, marginHorizontal: -spacing.gutter },
  pills: { paddingHorizontal: spacing.gutter, gap: spacing.xs },
  pillTouch: { minHeight: touchTarget, justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderWidth: sizes.borderWidth,
  },
});
