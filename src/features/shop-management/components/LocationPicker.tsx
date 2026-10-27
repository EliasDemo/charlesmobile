import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { BrandMap, Icon, Text, mapAvailable } from '@/shared/ui';

interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Lima: where the pin starts when there is no position yet. */
const LIMA: Coordinates = { latitude: -12.0464, longitude: -77.0428 };
const STREET_ZOOM = 16;

/**
 * Map with a pin for the shop's exact spot: tap where the shop is (no address geocoding). Until the
 * installed build includes the map, a placeholder keeps its room and "use my location" sets it.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('shop');
  if (!mapAvailable()) {
    // Room kept for the map: it appears when the build has the Maps key.
    return (
      <View
        style={[
          styles.map,
          styles.placeholder,
          {
            borderRadius: theme.radius.lg,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.primarySoft,
          },
        ]}
        testID="map-placeholder"
      >
        <Icon name="map" size={sizes.iconLarge} color={theme.colors.primary} />
        <Text align="center" color="textSecondary">
          {t('form.mapSoon')}
        </Text>
      </View>
    );
  }
  const pin = value ?? LIMA;
  return (
    <View style={styles.root}>
      <View style={[styles.map, { borderRadius: theme.radius.lg, borderColor: theme.colors.border }]}>
        <BrandMap
          center={pin}
          zoom={STREET_ZOOM}
          pins={[{ id: 'shop', ...pin, selected: true }]}
          onPick={onChange}
          testID="location-picker"
        />
      </View>
      <Text variant="caption" color="textSecondary">
        {t('form.pinHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  map: { height: sizes.mapPreview, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
