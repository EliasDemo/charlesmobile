import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { formatDistance, formatRating, openDirections, openWaze } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  BrandMap,
  Button,
  EmptyState,
  Icon,
  Notice,
  Text,
  mapAvailable,
  useSurfaceStyle,
  useTabBarSpace,
  type BrandMapHandle,
  type IconName,
} from '@/shared/ui';
import type { SearchResult } from '../api/searchApi';
import type { SearchCenter } from '../hooks/searchStore';
import { clusterPoints } from './mapClusters';
import { ResultCard } from './ResultCard';

/** Lima: only when there is no position, no search area and no result to show. */
const DEFAULT_CENTER = { latitude: -12.0464, longitude: -77.0428 };
const CITY_ZOOM = 11;
const AREA_ZOOM = 14;
/** Pins closer than this on screen (px) are grouped: a pin with its label is about this wide. */
const GROUP_RADIUS = sizes.avatarSmall + spacing.lg;
/** Room around the pins when they are framed: the search button above, the cards below. */
const FIT_PADDING = { top: touchTarget * 2, bottom: touchTarget * 5, side: touchTarget };
const CARD_WIDTH = 248;
const CARD_STEP = CARD_WIDTH + spacing.sm;

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
  const cards = useRef<FlatList<SearchResult>>(null);
  const [moved, setMoved] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Only where the map opens; later moves are the user's.
  const [start] = useState(() =>
    center
      ? { center: { latitude: center.latitude, longitude: center.longitude }, zoom: AREA_ZOOM }
      : { center: DEFAULT_CENTER, zoom: CITY_ZOOM },
  );
  const [zoom, setZoom] = useState(start.zoom);
  const device = center?.source === 'device' ? center : null;

  // Pins that would overlap become one counter; the selected one always stays on its own.
  const groups = useMemo(
    () =>
      clusterPoints(
        items.filter((item) => item.id !== selectedId),
        Math.round(zoom),
        GROUP_RADIUS,
      ),
    [items, selectedId, zoom],
  );
  const pins = useMemo(() => {
    const toPin = (item: SearchResult, selected: boolean) => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      selected,
      imageUrl: mediaUrl(item.logoUrl),
      label: item.distanceMeters !== null ? formatDistance(item.distanceMeters) : undefined,
    });
    const list = groups.map((g) =>
      g.members.length === 1
        ? toPin(g.members[0]!, false)
        : { id: g.id, latitude: g.latitude, longitude: g.longitude, count: g.members.length },
    );
    const selected = items.find((item) => item.id === selectedId);
    // Last, so it is drawn above the others.
    return selected ? [...list, toPin(selected, true)] : list;
  }, [groups, items, selectedId]);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const select = (id: string, { fly }: { fly: boolean }) => {
    setSelectedId(id);
    const index = items.findIndex((item) => item.id === id);
    const item = items[index];
    if (!item) return;
    if (fly) map.current?.flyTo(item, Math.max(zoom, AREA_ZOOM));
    cards.current?.scrollToOffset({ offset: index * CARD_STEP, animated: true });
  };

  const onPinPress = (id: string) => {
    const group = groups.find((g) => g.id === id && g.members.length > 1);
    // A group opens up: the camera frames its members, close enough to tell them apart.
    if (group) return map.current?.fit(group.members, FIT_PADDING);
    select(id, { fly: false });
  };

  // Opening: where the person is, if the phone already allows it.
  useEffect(() => {
    onLocateSilently();
    // Once, when the map opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new position of the person: the camera goes there.
  const deviceKey = device ? `${device.latitude},${device.longitude}` : null;
  useEffect(() => {
    if (device) map.current?.flyTo(device, AREA_ZOOM);
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
        onPinPress={onPinPress}
        onMoved={setMoved}
        onViewChange={(view) => setZoom(view.zoom)}
        onPick={() => setSelectedId(null)}
        user={device}
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

      <View style={styles.side} pointerEvents="box-none">
        <View style={styles.zoomPair}>
          <MapButton icon="add" label={t('map.zoomIn')} onPress={() => map.current?.zoomBy(1)} />
          <MapButton icon="remove" label={t('map.zoomOut')} onPress={() => map.current?.zoomBy(-1)} />
        </View>
      </View>

      <View style={[styles.bottom, { bottom: spacing.md + tabBar }]} pointerEvents="box-none">
        <View style={styles.controls} pointerEvents="box-none">
          {items.length > 1 ? (
            <MapButton
              icon="scan-outline"
              label={t('map.showAll')}
              onPress={() => {
                setSelectedId(null);
                map.current?.fit(items, FIT_PADDING);
              }}
            />
          ) : null}
          <MapButton
            icon={device ? 'locate' : 'locate-outline'}
            label={t('map.myLocation')}
            onPress={() => {
              setMoved(null);
              if (device) map.current?.flyTo(device, AREA_ZOOM);
              else onLocate();
            }}
            busy={locating}
            active={Boolean(device)}
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
              <MapButton icon="close" label={t('map.close')} onPress={() => setSelectedId(null)} />
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
        ) : (
          // Nearest first when the API knows the distance; swiping moves the map to each one.
          <FlatList
            ref={cards}
            data={items}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_STEP}
            decelerationRate="fast"
            style={styles.cards}
            contentContainerStyle={styles.cardsContent}
            onMomentumScrollEnd={(e) => {
              const item = items[Math.round(e.nativeEvent.contentOffset.x / CARD_STEP)];
              if (item) map.current?.flyTo(item, Math.max(zoom, AREA_ZOOM));
            }}
            renderItem={({ item }) => <MiniCard item={item} onPress={() => select(item.id, { fly: true })} />}
          />
        )}
      </View>
    </View>
  );
}

/** A small card of the carousel: photo, name, distance and rating at a glance. */
function MiniCard({ item, onPress }: { item: SearchResult; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('search');
  const surface = useSurfaceStyle();
  const image = mediaUrl(item.coverThumbUrl ?? item.logoUrl);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={onPress}
      style={[styles.mini, surface, { borderRadius: theme.radius.lg }]}
      testID={`map-card-${item.id}`}
    >
      {image ? (
        <Image source={{ uri: image }} style={[styles.miniImage, { borderRadius: theme.radius.md }]} />
      ) : (
        <View
          style={[
            styles.miniImage,
            styles.center,
            { borderRadius: theme.radius.md, backgroundColor: theme.colors.brand },
          ]}
        >
          <Icon name="cut" size={sizes.icon} color={theme.colors.brandAccent} />
        </View>
      )}
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.miniRow}>
          {item.distanceMeters !== null ? (
            <View
              style={[
                styles.distance,
                { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.pill },
              ]}
            >
              <Icon name="walk" size={sizes.icon - spacing.sm} color={theme.colors.primary} />
              <Text variant="caption" color="primary">
                {formatDistance(item.distanceMeters)}
              </Text>
            </View>
          ) : null}
          {item.rating.average !== null && item.rating.count > 0 ? (
            <View style={styles.miniRow}>
              <Icon name="star" size={sizes.icon - spacing.sm} color={theme.colors.medalGold} />
              <Text variant="caption" color="textSecondary">
                {formatRating(item.rating.average)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" color={item.isOpenNow ? 'success' : 'textMuted'} numberOfLines={1}>
          {item.isOpenNow ? t('map.openNow') : t('map.closedNow')}
        </Text>
      </View>
    </Pressable>
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
  // Clips the pins at the map's edge: they never draw over the search bar above.
  container: { flex: 1, overflow: 'hidden' },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  notice: { padding: spacing.lg },
  top: { position: 'absolute', top: spacing.md, alignSelf: 'center' },
  side: { position: 'absolute', top: spacing.md, right: spacing.lg },
  zoomPair: { gap: spacing.xs },
  bottom: { position: 'absolute', left: 0, right: 0, gap: spacing.sm },
  controls: { alignSelf: 'flex-end', gap: spacing.sm, marginRight: spacing.lg },
  mapButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  selection: { gap: spacing.sm, marginHorizontal: spacing.lg },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyBox: { padding: spacing.sm, marginHorizontal: spacing.lg },
  cards: { flexGrow: 0 },
  cardsContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xs },
  mini: { width: CARD_WIDTH, flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  miniImage: { width: sizes.avatar + spacing.sm, height: sizes.avatar + spacing.sm },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
});
