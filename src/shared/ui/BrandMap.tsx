import { forwardRef, useImperativeHandle, useRef } from 'react';
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

/** Moves the camera from the screen: to a point, or so that several points fit. */
export interface BrandMapHandle {
  flyTo: (center: Coordinates, zoom?: number) => void;
  fit: (points: Coordinates[], padding?: { top: number; bottom: number; side: number }) => void;
}

type CameraRef = import('@maplibre/maplibre-react-native').CameraRef;

const FLY_MS = 900;
/** One point alone (or all in the same place) is shown at street level, not at the closest zoom. */
const SINGLE_POINT_ZOOM = 15;

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
export const BrandMap = forwardRef<BrandMapHandle, BrandMapProps>(function BrandMap(
  { center, zoom, pins = [], onPinPress, onMoved, onPick, showUser, style, testID },
  ref,
) {
  const theme = useTheme();
  const camera = useRef<CameraRef>(null);
  useImperativeHandle(ref, () => ({
    flyTo: (to, toZoom) =>
      camera.current?.flyTo({ center: toLngLat(to), zoom: toZoom ?? SINGLE_POINT_ZOOM, duration: FLY_MS }),
    fit: (points, padding) => {
      if (points.length === 0) return;
      const lngs = points.map((p) => p.longitude);
      const lats = points.map((p) => p.latitude);
      const [west, east, south, north] = [
        Math.min(...lngs),
        Math.max(...lngs),
        Math.min(...lats),
        Math.max(...lats),
      ];
      if (west === east && south === north) {
        camera.current?.flyTo({ center: [west, south], zoom: SINGLE_POINT_ZOOM, duration: FLY_MS });
        return;
      }
      camera.current?.fitBounds([west, south, east, north], {
        padding: padding
          ? { top: padding.top, bottom: padding.bottom, left: padding.side, right: padding.side }
          : undefined,
        duration: FLY_MS,
      });
    },
  }));
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
      <Camera ref={camera} initialViewState={{ center: toLngLat(center), zoom }} />
      {showUser ? <UserLocation animated heading accuracy /> : null}
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
});

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
