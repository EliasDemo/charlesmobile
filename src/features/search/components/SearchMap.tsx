import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing, useTheme } from '@/shared/theme';
import { BrandMap, Button, EmptyState, Notice, mapAvailable } from '@/shared/ui';
import type { SearchResult } from '../api/searchApi';
import type { SearchCenter } from '../hooks/searchStore';
import { ResultCard } from './ResultCard';

/** Lima: where the map starts when there is no search center yet. */
const DEFAULT_CENTER = { latitude: -12.0464, longitude: -77.0428 };
const CITY_ZOOM = 11;
const AREA_ZOOM = 13;

export interface SearchMapProps {
  items: SearchResult[];
  center: SearchCenter | null;
  onSearchHere: (center: SearchCenter) => void;
  onOpenBarbershop: (id: string) => void;
  onShowList: () => void;
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

function ResultsMap({ items, center, onSearchHere, onOpenBarbershop }: SearchMapProps) {
  const theme = useTheme();
  const { t } = useTranslation('search');
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

  return (
    <View style={styles.container}>
      <BrandMap
        center={start.center}
        zoom={start.zoom}
        pins={pins}
        onPinPress={setSelectedId}
        onMoved={setMoved}
        showUser={center?.source === 'device'}
        testID="results-map"
      />
      {moved ? (
        <View style={styles.top}>
          <Button label={t('map.searchHere')} onPress={() => onSearchHere({ ...moved, source: 'map' })} />
        </View>
      ) : null}
      <View style={styles.bottom}>
        {selected ? (
          <ResultCard item={selected} onPress={onOpenBarbershop} />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  notice: { padding: spacing.lg },
  top: { position: 'absolute', top: spacing.md, alignSelf: 'center' },
  bottom: { position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg },
  emptyBox: { padding: spacing.sm },
});
