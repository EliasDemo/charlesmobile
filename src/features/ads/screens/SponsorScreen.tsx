import { Image, StyleSheet, View } from 'react-native';
import { mediaUrl } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { openWebUrl } from '@/shared/lib';
import { sizes, spacing } from '@/shared/theme';
import { Badge, Button, Card, Monogram, Notice, QueryView, Screen, Text } from '@/shared/ui';
import { useSponsor } from '../hooks/useAds';

/** A sponsor's catalog. Charles does not sell: "Ver en la tienda" opens the sponsor's page. */
export function SponsorScreen({ id }: { id: string }) {
  const { t } = useTranslation('ads');
  const sponsor = useSponsor(id);
  return (
    <Screen>
      <QueryView query={sponsor}>
        {(s) => (
          <View style={styles.content}>
            <View style={styles.header}>
              <Monogram name={s.name} size={sizes.avatarLarge} imageUrl={s.logoUrl} />
              <View style={styles.flex}>
                <Text variant="title">{s.name}</Text>
                <Badge label={t('label')} />
              </View>
            </View>
            <Notice tone="info" message={t('notSold')} />
            {s.products.length === 0 ? <Text color="textSecondary">{t('noProducts')}</Text> : null}
            {s.products.map((product) => {
              const image = mediaUrl(product.imageUrl);
              return (
                <Card key={product.id}>
                  {image ? <Image source={{ uri: image }} style={styles.image} /> : null}
                  <Text variant="bodyStrong">{product.name}</Text>
                  {product.description ? <Text color="textSecondary">{product.description}</Text> : null}
                  {product.priceText ? <Text variant="bodyStrong">{product.priceText}</Text> : null}
                  {product.actionUrl ? (
                    <Button
                      label={t('seeInStore')}
                      variant="secondary"
                      icon="open"
                      onPress={() => void openWebUrl(product.actionUrl!).catch(() => undefined)}
                    />
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  image: { width: '100%', aspectRatio: 4 / 3 },
});
