import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDistrictSearch, type Location } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { SearchField } from './SearchField';
import { Text } from './Text';

const SEARCH_DELAY_MS = 300;

/**
 * A field that opens Peru's districts (from the API, with their ubigeo) with a search: everyone
 * picks the same place (no typos), which makes "cerca" filters work.
 */
export function DistrictPicker({
  label,
  value,
  onChange,
  allowAll,
}: {
  label: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  /** Shows "Todo el Perú" first (filters). */
  allowAll?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setTerm(q), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [q]);
  const search = useDistrictSearch(term);
  const found: (Location | null)[] = search.data ?? [];
  const rows = allowAll ? [null, ...found] : found;
  const shown = value ? value.district : '';
  return (
    <View style={styles.field}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown || t('district.none')}`}
        onPress={() => setOpen(true)}
        style={[
          styles.box,
          {
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
          },
        ]}
        testID="district-picker"
      >
        <Icon name="location" size={sizes.icon} color={theme.colors.textMuted} />
        <View style={styles.flex}>
          <Text color={value ? 'textPrimary' : 'textMuted'}>
            {shown || (allowAll ? t('district.all') : t('district.choose'))}
          </Text>
          {value ? (
            <Text variant="caption" color="textMuted">
              {`${value.province}, ${value.department}`}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-down" size={sizes.icon} color={theme.colors.textMuted} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.background, paddingTop: insets.top + spacing.sm },
          ]}
        >
          <View style={styles.header}>
            <Text variant="title" style={styles.flex}>
              {label}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('actions.close')}
              onPress={() => setOpen(false)}
              style={styles.close}
            >
              <Icon name="close" size={touchTarget / 2} color={theme.colors.textPrimary} />
            </Pressable>
          </View>
          <SearchField
            label={t('district.search')}
            value={q}
            onChangeText={setQ}
            placeholder={t('district.search')}
          />
          {search.isPending ? <ActivityIndicator color={theme.colors.primary} /> : null}
          {search.isError ? (
            <Text color="textSecondary" align="center">
              {t('district.error')}
            </Text>
          ) : null}
          <FlatList
            data={rows}
            keyExtractor={(r) => r?.ubigeo ?? 'all'}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
            renderItem={({ item }) => {
              const selected = (item?.ubigeo ?? null) === (value?.ubigeo ?? null);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                    setQ('');
                  }}
                  style={[styles.row, { borderBottomColor: theme.colors.border }]}
                >
                  <View style={styles.flex}>
                    <Text
                      variant={selected ? 'bodyStrong' : 'body'}
                      color={selected ? 'primary' : 'textPrimary'}
                    >
                      {item ? item.district : t('district.all')}
                    </Text>
                    {item ? (
                      <Text variant="caption" color="textMuted">
                        {`${item.province}, ${item.department}`}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? <Icon name="checkmark" size={sizes.icon} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget + spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: sizes.borderWidth,
  },
  flex: { flex: 1 },
  sheet: { flex: 1, paddingHorizontal: spacing.gutter, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center' },
  close: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget + spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
