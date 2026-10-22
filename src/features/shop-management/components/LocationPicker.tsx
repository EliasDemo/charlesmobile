import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Icon, Text } from '@/shared/ui';

interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Lima: where the pin starts when there is no position yet. */
const LIMA: Coordinates = { latitude: -12.0464, longitude: -77.0428 };
const DELTA = 0.01;

/**
 * Map with a draggable pin for the shop's exact spot (no address geocoding: it is a paid service).
 * Long-press also moves the pin. Without the Maps key in the build, nothing is shown and the
 * "use my location" button stays the way to set it.
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
  if (!env.mapsEnabled) {
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
        <MapView
          style={StyleSheet.absoluteFill}
          region={{ ...pin, latitudeDelta: DELTA, longitudeDelta: DELTA }}
          userInterfaceStyle={theme.scheme}
          onLongPress={(event) => onChange(event.nativeEvent.coordinate)}
          testID="location-picker"
        >
          <Marker
            coordinate={pin}
            draggable
            pinColor={theme.colors.primary}
            onDragEnd={(event) => onChange(event.nativeEvent.coordinate)}
          />
        </MapView>
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
