import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { translateError } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Button, EmptyState, ErrorState, Screen, SkeletonList, Text } from '@/shared/ui';
import { PhotoViewer, Thumb } from '../components/GalleryParts';
import { useGallery } from '../hooks/useGallery';

const COLUMNS = 3;
const PREVIEW = 6;

/** Grid width from the space it actually gets, so thumbnails stay square at any screen size. */
function useTileSize() {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const size = width > 0 ? Math.floor((width - spacing.sm * (COLUMNS - 1)) / COLUMNS) : 0;
  return { onLayout, size };
}

/**
 * "Trabajos" in the barbershop detail: the first photos (highlighted first) and "Ver todos".
 * Shows nothing while the barbershop has no photos.
 */
export function GallerySection({
  barbershopId,
  onOpenAll,
  onBookStyle,
}: {
  barbershopId: string;
  onOpenAll: () => void;
  onBookStyle: (serviceId: string, barberId: string | null) => void;
}) {
  const { t } = useTranslation('gallery');
  const g = useGallery(barbershopId);
  const tile = useTileSize();
  if (g.photos.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text variant="subtitle">{t('title')}</Text>
      <View style={styles.grid} onLayout={tile.onLayout} testID="gallery-grid">
        {tile.size > 0
          ? g.photos
              .slice(0, PREVIEW)
              .map((photo, index) => (
                <Thumb
                  key={photo.id}
                  photo={photo}
                  size={tile.size}
                  index={index}
                  onPress={() => g.show(photo)}
                />
              ))
          : null}
      </View>
      {g.photos.length > PREVIEW || g.query.hasNextPage ? (
        <Button label={t('seeAll')} variant="secondary" icon="images" onPress={onOpenAll} />
      ) : null}
      <PhotoViewer
        photo={g.open}
        onClose={g.close}
        onBookStyle={(serviceId, barberId) => {
          g.close();
          onBookStyle(serviceId, barberId);
        }}
      />
    </View>
  );
}

/** All the photos of a barbershop, in a grid. */
export function GalleryScreen({
  barbershopId,
  onBookStyle,
}: {
  barbershopId: string;
  onBookStyle: (serviceId: string, barberId: string | null) => void;
}) {
  const { t } = useTranslation('gallery');
  const g = useGallery(barbershopId);
  const tile = useTileSize();
  return (
    <Screen>
      {g.query.isPending ? (
        <SkeletonList count={2} />
      ) : g.query.error ? (
        <ErrorState message={translateError(g.query.error).message} onRetry={() => void g.query.refetch()} />
      ) : g.photos.length === 0 ? (
        <EmptyState icon="images-outline" title={t('empty')} />
      ) : (
        <>
          <View style={styles.grid} onLayout={tile.onLayout} testID="gallery-grid">
            {tile.size > 0
              ? g.photos.map((photo, index) => (
                  <Thumb
                    key={photo.id}
                    photo={photo}
                    size={tile.size}
                    index={index}
                    onPress={() => g.show(photo)}
                  />
                ))
              : null}
          </View>
          {g.query.hasNextPage ? (
            <Button
              label={t('more')}
              variant="secondary"
              onPress={() => void g.query.fetchNextPage()}
              loading={g.query.isFetchingNextPage}
            />
          ) : null}
        </>
      )}
      <PhotoViewer
        photo={g.open}
        onClose={g.close}
        onBookStyle={(serviceId, barberId) => {
          g.close();
          onBookStyle(serviceId, barberId);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
