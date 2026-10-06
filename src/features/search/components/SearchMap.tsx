import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { spacing, useTheme } from '@/shared/theme';
import { Button, EmptyState, Notice } from '@/shared/ui';
import type { SearchResult } from '../api/searchApi';
import type { SearchCenter } from '../hooks/searchStore';
import { ResultCard } from './ResultCard';

/** Lima: where the map starts when there is no search center yet. */
const DEFAULT_REGION: Region = {
  latitude: -12.0464,
  longitude: -77.0428,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};
const CENTER_DELTA = 0.05;

export interface SearchMapProps {
  items: SearchResult[];
  center: SearchCenter | null;
  onSearchHere: (center: SearchCenter) => void;
  onOpenBarbershop: (id: string) => void;
  onShowList: () => void;
}

/**
 * Map of the loaded results. On Android it needs a Google Maps key inside the native build: until
 * that build exists (env.mapsEnabled), a clear notice replaces the map instead of a gray area.
 */
export function SearchMap(props: SearchMapProps) {
  const { t } = useTranslation('search');
  if (!env.mapsEnabled) {
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
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const initialRegion = useMemo<Region>(
    () =>
      center
        ? {
            latitude: center.latitude,
            longitude: center.longitude,
            latitudeDelta: CENTER_DELTA,
            longitudeDelta: CENTER_DELTA,
          }
        : DEFAULT_REGION,
    // Only where the map opens; later moves are the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={setRegion}
        showsUserLocation={center?.source === 'device'}
        userInterfaceStyle={theme.scheme}
        testID="results-map"
      >
        {items.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            title={item.name}
            pinColor={theme.colors.primary}
            onPress={() => setSelectedId(item.id)}
          />
        ))}
      </MapView>
      {region ? (
        <View style={styles.top}>
          <Button
            label={t('map.searchHere')}
            onPress={() =>
              onSearchHere({ latitude: region.latitude, longitude: region.longitude, source: 'map' })
            }
          />
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
