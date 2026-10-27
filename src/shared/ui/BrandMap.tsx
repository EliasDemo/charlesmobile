import { StyleSheet, TurboModuleRegistry, View, type StyleProp, type ViewStyle } from 'react-native';
import { sizes, useTheme } from '@/shared/theme';
import { Icon } from './Icon';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapPin extends Coordinates {
  id: string;
  selected?: boolean;
}

type MapLibre = typeof import('@maplibre/maplibre-react-native');
let mapLibre: MapLibre | undefined;

/**
 * MapLibre (free, open source) once the build includes it. Rule 12: until then the installed build
 * keeps working and the screens show their notice instead of a map.
 */
function loadMapLibre(): MapLibre | null {
  if (!mapLibre && TurboModuleRegistry.get('MLRNMapViewModule')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mapLibre = require('@maplibre/maplibre-react-native') as MapLibre;
  }
  return mapLibre ?? null;
}

export function mapAvailable() {
  return loadMapLibre() !== null;
}

/**
 * OpenFreeMap: OpenStreetMap tiles with no key, no account and no usage limit. The attribution
 * ("© OpenStreetMap") is shown by the map itself, as its terms require.
 */
const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

export interface BrandMapProps {
  center: Coordinates;
  zoom: number;
  pins?: MapPin[];
  onPinPress?: (id: string) => void;
  /** Where the map rests after the user moved it ("Buscar en esta zona"). */
  onMoved?: (center: Coordinates) => void;
  /** Tap or long press on the map (to place a pin). */
  onPick?: (coordinates: Coordinates) => void;
  showUser?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const toLngLat = (c: Coordinates): [number, number] => [c.longitude, c.latitude];
const fromLngLat = ([longitude, latitude]: [number, number]): Coordinates => ({ latitude, longitude });

/** The app's map: brand pins (copper medallion with scissors), light and dark styles. */
export function BrandMap({
  center,
  zoom,
  pins = [],
  onPinPress,
  onMoved,
  onPick,
  showUser,
  style,
  testID,
}: BrandMapProps) {
  const theme = useTheme();
  const lib = loadMapLibre();
  if (!lib) return null;
  const { Map, Camera, Marker, UserLocation } = lib;
  return (
    <Map
      style={style ?? StyleSheet.absoluteFill}
      mapStyle={STYLE[theme.scheme]}
      logo={false}
      attribution
      compass={false}
      testID={testID}
      onPress={onPick ? (e) => onPick(fromLngLat(e.nativeEvent.lngLat)) : undefined}
      onLongPress={onPick ? (e) => onPick(fromLngLat(e.nativeEvent.lngLat)) : undefined}
      onRegionDidChange={
        onMoved
          ? (e) => {
              if (e.nativeEvent.userInteraction) onMoved(fromLngLat(e.nativeEvent.center));
            }
          : undefined
      }
    >
      <Camera initialViewState={{ center: toLngLat(center), zoom }} />
      {showUser ? <UserLocation /> : null}
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          id={pin.id}
          lngLat={toLngLat(pin)}
          anchor="bottom"
          onPress={onPinPress ? () => onPinPress(pin.id) : undefined}
        >
          <View
            style={[
              styles.pin,
              {
                backgroundColor: pin.selected ? theme.colors.brandAccent : theme.colors.brand,
                borderColor: pin.selected ? theme.colors.brand : theme.colors.brandAccent,
                transform: [{ scale: pin.selected ? SELECTED_SCALE : 1 }],
              },
            ]}
          >
            <Icon
              name="cut"
              size={sizes.icon}
              color={pin.selected ? theme.colors.brand : theme.colors.brandAccent}
            />
          </View>
        </Marker>
      ))}
    </Map>
  );
}

const SELECTED_SCALE = 1.2;

const styles = StyleSheet.create({
  pin: {
    width: sizes.avatarSmall,
    height: sizes.avatarSmall,
    borderRadius: sizes.avatarSmall / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
