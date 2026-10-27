import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Image, StyleSheet, TurboModuleRegistry, View, type StyleProp, type ViewStyle } from 'react-native';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapPin extends Coordinates {
  id: string;
  selected?: boolean;
  /** Small text under the pin (e.g. the distance, "850 m"). */
  label?: string;
  /** The place's logo inside the pin; scissors when there is none. */
  imageUrl?: string | null;
  /** A group of places too close to tell apart at this zoom: shown as a counter. */
  count?: number;
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

/** Moves the camera from the screen: to a point, so that several points fit, or one zoom step. */
export interface BrandMapHandle {
  flyTo: (center: Coordinates, zoom?: number) => void;
  fit: (points: Coordinates[], padding?: { top: number; bottom: number; side: number }) => void;
  zoomBy: (delta: number) => void;
}

export interface MapView {
  zoom: number;
  center: Coordinates;
}

type CameraRef = import('@maplibre/maplibre-react-native').CameraRef;

const FLY_MS = 900;
const ZOOM_MS = 250;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
/** One point alone (or all in the same place) is shown at street level, not at the closest zoom. */
const SINGLE_POINT_ZOOM = 15;

export interface BrandMapProps {
  center: Coordinates;
  zoom: number;
  pins?: MapPin[];
  onPinPress?: (id: string) => void;
  /** Where the map rests after the user moved it ("Buscar en esta zona"). */
  onMoved?: (center: Coordinates) => void;
  /** Every time the map rests, moved by the user or not (zoom for grouping pins). */
  onViewChange?: (view: MapView) => void;
  /** Tap or long press on the map (to place a pin). */
  onPick?: (coordinates: Coordinates) => void;
  /** The person's position: a figure with a halo ("you are here"). */
  user?: Coordinates | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const toLngLat = (c: Coordinates): [number, number] => [c.longitude, c.latitude];
const fromLngLat = ([longitude, latitude]: [number, number]): Coordinates => ({ latitude, longitude });

/** The app's map: brand pins (navy drop with the logo), groups, "you are here", light and dark. */
export const BrandMap = forwardRef<BrandMapHandle, BrandMapProps>(function BrandMap(
  { center, zoom, pins = [], onPinPress, onMoved, onViewChange, onPick, user, style, testID },
  ref,
) {
  const theme = useTheme();
  const camera = useRef<CameraRef>(null);
  const currentZoom = useRef(zoom);
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
    zoomBy: (delta) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom.current + delta));
      currentZoom.current = next;
      camera.current?.zoomTo(next, { duration: ZOOM_MS });
    },
  }));
  const lib = loadMapLibre();
  if (!lib) return null;
  const { Map, Camera, Marker } = lib;
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
      onRegionDidChange={(e) => {
        const view = { zoom: e.nativeEvent.zoom, center: fromLngLat(e.nativeEvent.center) };
        currentZoom.current = view.zoom;
        onViewChange?.(view);
        if (onMoved && e.nativeEvent.userInteraction) onMoved(view.center);
      }}
    >
      <Camera ref={camera} initialViewState={{ center: toLngLat(center), zoom }} />
      {user ? (
        <Marker id="user" lngLat={toLngLat(user)} anchor="center">
          <UserMarker />
        </Marker>
      ) : null}
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          id={pin.id}
          lngLat={toLngLat(pin)}
          anchor={pin.count ? 'center' : 'bottom'}
          onPress={onPinPress ? () => onPinPress(pin.id) : undefined}
        >
          {pin.count ? <GroupMarker count={pin.count} /> : <PlaceMarker pin={pin} />}
        </Marker>
      ))}
    </Map>
  );
});

/** A drop: round head (logo or scissors) with a point at the exact spot, and its label below. */
function PlaceMarker({ pin }: { pin: MapPin }) {
  const theme = useTheme();
  const ring = pin.selected ? theme.colors.brandAccent : theme.colors.onBrand;
  return (
    <View style={[styles.place, pin.selected && styles.selected]}>
      <View
        style={[
          styles.head,
          styles.shadow,
          { backgroundColor: theme.colors.brand, borderColor: ring, shadowColor: theme.colors.shadow },
        ]}
      >
        {pin.imageUrl ? (
          <Image source={{ uri: pin.imageUrl }} style={styles.logo} />
        ) : (
          <Icon name="cut" size={sizes.icon} color={theme.colors.brandAccent} />
        )}
      </View>
      <View style={[styles.tip, { borderTopColor: ring }]} />
      {pin.label ? (
        <View
          style={[
            styles.label,
            styles.shadow,
            {
              backgroundColor: pin.selected ? theme.colors.brand : theme.colors.surface,
              borderRadius: theme.radius.pill,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <Text
            variant="caption"
            color={pin.selected ? 'onBrand' : 'textPrimary'}
            maxFontSizeMultiplier={1.3}
          >
            {pin.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Several places together: a circle in the action color with how many there are. */
function GroupMarker({ count }: { count: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.group,
        styles.shadow,
        {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <Text variant="bodyStrong" color="onPrimary" maxFontSizeMultiplier={1.3}>
        {count > 99 ? '99+' : String(count)}
      </Text>
    </View>
  );
}

/** "You are here": a figure in a circle, inside a soft halo. */
function UserMarker() {
  const theme = useTheme();
  return (
    <View
      style={[styles.halo, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.focus }]}
    >
      <View
        style={[
          styles.user,
          styles.shadow,
          {
            backgroundColor: theme.colors.focus,
            borderColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <Icon name="person" size={sizes.icon - spacing.xs} color={theme.colors.surface} />
      </View>
    </View>
  );
}

const HEAD = sizes.avatarSmall;
const TIP = spacing.sm;
const GROUP = sizes.avatarSmall + spacing.sm;
const HALO = sizes.avatarSmall + spacing.lg;
const USER = sizes.avatarSmall - spacing.md;

const styles = StyleSheet.create({
  place: { alignItems: 'center' },
  selected: { transform: [{ scale: 1.2 }] },
  head: {
    width: HEAD,
    height: HEAD,
    borderRadius: HEAD / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  tip: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: TIP / 1.4,
    borderRightWidth: TIP / 1.4,
    borderTopWidth: TIP,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  label: { marginTop: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  shadow: { shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, shadowOpacity: 1, elevation: 4 },
  group: {
    width: GROUP,
    height: GROUP,
    borderRadius: GROUP / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  user: {
    width: USER,
    height: USER,
    borderRadius: USER / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
