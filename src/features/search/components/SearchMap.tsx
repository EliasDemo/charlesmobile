import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { openDirections, openWaze } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  BrandMap,
  Button,
  EmptyState,
  Icon,
  Notice,
  mapAvailable,
  useSurfaceStyle,
  useTabBarSpace,
  type BrandMapHandle,
  type IconName,
} from '@/shared/ui';
import type { SearchResult } from '../api/searchApi';
import type { SearchCenter } from '../hooks/searchStore';
import { ResultCard } from './ResultCard';

/** Lima: only when there is no position, no search area and no result to show. */
const DEFAULT_CENTER = { latitude: -12.0464, longitude: -77.0428 };
const CITY_ZOOM = 11;
const AREA_ZOOM = 14;
/** Room around the pins when they are framed: the search button above, the card below. */
const FIT_PADDING = { top: touchTarget * 2, bottom: touchTarget * 5, side: touchTarget };

export interface SearchMapProps {
  items: SearchResult[];
  center: SearchCenter | null;
  onSearchHere: (center: SearchCenter) => void;
  onOpenBarbershop: (id: string) => void;
  onShowList: () => void;
  /** "Mi ubicación": the explained permission flow of "Cerca de mí". */
  onLocate: () => void;
  /** On opening: the position only if permission was already given (never a dialog). */
  onLocateSilently: () => void;
  locating: boolean;
}

/**
 * Map of the loaded results (MapLibre + OpenStreetMap, free). Until the installed build includes
 * the map, a clear notice replaces it instead of a gray area.
 */
export function SearchMap(props: SearchMapProps) {
  const { t } = useTranslation('search');
  if (!mapAvailable()) {
    return (
      <View style={styles.notice} testID="map-unavailable">
        <Notice tone="info" title={t('map.unavailableTitle')} message={t('map.unavailableMessage')}>
          <Button label={t('map.backToList')} variant="secondary" onPress={props.onShowList} />
        </Notice>
      </View>
    );
  }
  return <ResultsMap {...props} />;
}

function ResultsMap({
  items,
  center,
  onSearchHere,
  onOpenBarbershop,
  onLocate,
  onLocateSilently,
  locating,
}: SearchMapProps) {
  const theme = useTheme();
  const { t } = useTranslation('search');
  const tabBar = useTabBarSpace();
  const map = useRef<BrandMapHandle>(null);
  const [moved, setMoved] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Only where the map opens; later moves are the user's.
  const [start] = useState(() =>
    center
      ? { center: { latitude: center.latitude, longitude: center.longitude }, zoom: AREA_ZOOM }
      : { center: DEFAULT_CENTER, zoom: CITY_ZOOM },
  );
  const pins = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        selected: item.id === selectedId,
      })),
    [items, selectedId],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

  // Opening: where the person is, if the phone already allows it.
  useEffect(() => {
    onLocateSilently();
    // Once, when the map opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new position of the person: the camera goes there.
  const deviceKey = center?.source === 'device' ? `${center.latitude},${center.longitude}` : null;
  useEffect(() => {
    if (center && deviceKey) {
      map.current?.flyTo(center, AREA_ZOOM);
    }
    // deviceKey stands for the coordinates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceKey]);

  // Without a position or an area, the first results are framed (instead of staying on Lima).
  const framed = useRef(Boolean(center));
  useEffect(() => {
    if (framed.current || items.length === 0) return;
    framed.current = true;
    map.current?.fit(items, FIT_PADDING);
  }, [items]);

  return (
    <View style={styles.container}>
      <BrandMap
        ref={map}
        center={start.center}
        zoom={start.zoom}
        pins={pins}
        onPinPress={setSelectedId}
        onMoved={setMoved}
        onPick={() => setSelectedId(null)}
        showUser={center?.source === 'device'}
        testID="results-map"
      />
      {moved ? (
        <View style={styles.top}>
          <Button
            label={t('map.searchHere')}
            icon="search"
            onPress={() => {
              onSearchHere({ ...moved, source: 'map' });
              setMoved(null);
            }}
          />
        </View>
      ) : null}
      <View style={[styles.bottom, { bottom: spacing.lg + tabBar }]} pointerEvents="box-none">
        <View style={styles.controls} pointerEvents="box-none">
          {items.length > 1 ? (
            <MapButton
              icon="scan-outline"
              label={t('map.showAll')}
              onPress={() => map.current?.fit(items, FIT_PADDING)}
            />
          ) : null}
          <MapButton
            icon={center?.source === 'device' ? 'locate' : 'locate-outline'}
            label={t('map.myLocation')}
            onPress={() => {
              setMoved(null);
              if (center?.source === 'device') map.current?.flyTo(center, AREA_ZOOM);
              else onLocate();
            }}
            busy={locating}
            active={center?.source === 'device'}
            testID="map-my-location"
          />
        </View>
        {selected ? (
          <View style={styles.selection}>
            <ResultCard item={selected} onPress={onOpenBarbershop} />
            <View style={styles.routeRow}>
              <View style={styles.flex}>
                <Button
                  label={t('map.directions')}
                  icon="navigate"
                  onPress={() =>
                    void openDirections({
                      latitude: selected.latitude,
                      longitude: selected.longitude,
                      label: selected.name,
                    })
                  }
                  fullWidth
                />
              </View>
              <Button
                label={t('map.waze')}
                variant="secondary"
                onPress={() => void openWaze({ latitude: selected.latitude, longitude: selected.longitude })}
              />
            </View>
          </View>
        ) : items.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg },
            ]}
          >
            <EmptyState message={t('map.empty')} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Round floating button over the map. */
function MapButton({
  icon,
  label,
  onPress,
  busy,
  active,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  busy?: boolean;
  active?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const surface = useSurfaceStyle();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: Boolean(busy), selected: Boolean(active) }}
      disabled={busy}
      onPress={onPress}
      style={[styles.mapButton, surface, { borderRadius: touchTarget / 2 }]}
      testID={testID}
    >
      {busy ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <Icon
          name={icon}
          size={sizes.icon + spacing.xs}
          color={active ? theme.colors.primary : theme.colors.textPrimary}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  notice: { padding: spacing.lg },
  top: { position: 'absolute', top: spacing.md, alignSelf: 'center' },
  bottom: { position: 'absolute', left: spacing.lg, right: spacing.lg, gap: spacing.sm },
  controls: { alignSelf: 'flex-end', gap: spacing.sm },
  mapButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  selection: { gap: spacing.sm },
  routeRow: { flexDirection: 'row', gap: spacing.sm },
  emptyBox: { padding: spacing.sm },
});
