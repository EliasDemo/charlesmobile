import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/i18n';
import { PERU_DISTRICTS } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { SearchField } from './SearchField';
import { Text } from './Text';

const ROWS = PERU_DISTRICTS.flatMap((p) => p.districts.map((d) => ({ district: d, province: p.province })));
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * A field that opens the list of districts with a search: everyone picks the same names
 * (no typos), which makes "cerca" filters work.
 */
export function DistrictPicker({
  label,
  value,
  onChange,
  allowAll,
}: {
  label: string;
  value: string;
  onChange: (district: string) => void;
  /** Shows "Todo el Perú" first (filters). */
  allowAll?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const term = normalize(q.trim());
    const found = term ? ROWS.filter((r) => normalize(r.district).includes(term)) : ROWS;
    return allowAll ? [{ district: '', province: '' }, ...found] : found;
  }, [q, allowAll]);
  return (
    <View style={styles.field}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || t('district.none')}`}
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
        <Text style={styles.flex} color={value ? 'textPrimary' : 'textMuted'}>
          {value || (allowAll ? t('district.all') : t('district.choose'))}
        </Text>
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
          <FlatList
            data={rows}
            keyExtractor={(r) => r.district || 'all'}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
            renderItem={({ item }) => {
              const selected = item.district === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(item.district);
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
                      {item.district || t('district.all')}
                    </Text>
                    {item.province ? (
                      <Text variant="caption" color="textMuted">
                        {item.province}
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
