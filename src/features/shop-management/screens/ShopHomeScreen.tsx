import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import {
  Button,
  Chip,
  EmptyState,
  ListRow,
  Notice,
  QueryView,
  Screen,
  StatusPill,
  Text,
  type IconName,
} from '@/shared/ui';
import type { ManagedShop } from '../api/shopApi';
import { useShopHome } from '../hooks/useShopHome';
import { REVIEW_STATES } from '../hooks/useShopReview';

export type ShopSection =
  'review' | 'details' | 'status' | 'services' | 'barbers' | 'members' | 'hours' | 'blocks';

export interface ShopHomeScreenProps {
  onCreate: () => void;
  onInvitations: () => void;
  onOpen: (shopId: string, section: ShopSection) => void;
  /** A barber's own blocks or hours in a barbershop they work at. */
  onOpenAsBarber: (shopId: string, barberId: string, section: 'blocks' | 'hours', timeZone: string) => void;
}

const STATUS_STYLE: Record<
  ManagedShop['status'],
  { tone: 'success' | 'pending' | 'danger' | 'neutral'; icon: IconName }
> = {
  OPEN: { tone: 'success', icon: 'storefront' },
  TEMPORARILY_CLOSED: { tone: 'pending', icon: 'pause-circle' },
  PENDING_REVIEW: { tone: 'neutral', icon: 'hourglass' },
  DRAFT: { tone: 'pending', icon: 'document-text' },
  CHANGES_REQUESTED: { tone: 'danger', icon: 'alert-circle' },
  SUSPENDED: { tone: 'danger', icon: 'ban' },
};

const SECTIONS: ShopSection[] = ['details', 'status', 'services', 'barbers', 'members', 'hours', 'blocks'];

export function ShopHomeScreen({ onCreate, onInvitations, onOpen, onOpenAsBarber }: ShopHomeScreenProps) {
  const { t } = useTranslation('shop');
  const home = useShopHome();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <Text variant="title">{t('home.title')}</Text>
      <QueryView query={home.mine} skeletonCount={2}>
        {() => (
          <View style={styles.content}>
            {home.shops.length === 0 && home.barberProfiles.length === 0 ? (
              <EmptyState
                icon="storefront-outline"
                title={t('home.emptyTitle')}
                message={t('home.emptyMessage')}
                action={{ label: t('home.create'), onPress: onCreate }}
              />
            ) : null}
            {home.shops.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {home.shops.map((shop) => (
                  <Chip
                    key={shop.id}
                    label={shop.name}
                    selected={shop.id === home.currentId}
                    onPress={() => home.selectShop(shop.id)}
                  />
                ))}
              </ScrollView>
            ) : null}
            {home.currentId ? (
              <QueryView query={home.shop}>
                {(shop) => (
                  <View style={styles.content}>
                    <View style={styles.header}>
                      <Text variant="subtitle">{shop.name}</Text>
                      <View style={styles.pills}>
                        <StatusPill
                          tone={STATUS_STYLE[shop.status].tone}
                          icon={STATUS_STYLE[shop.status].icon}
                          label={t(`status.${shop.status}`)}
                        />
                        <Text variant="caption" color="textSecondary">
                          {t(`home.role.${shop.myRole}`)} · {t(`type.${shop.type}`)}
                        </Text>
                      </View>
                    </View>
                    {shop.status === 'PENDING_REVIEW' ? (
                      <Notice tone="info" message={t('home.pendingReview')} />
                    ) : null}
                    {shop.status === 'DRAFT' ? <Notice tone="warning" message={t('home.draft')} /> : null}
                    {shop.status === 'CHANGES_REQUESTED' ? (
                      <Notice tone="warning" message={t('home.changesRequested')} />
                    ) : null}
                    {shop.status === 'SUSPENDED' ? (
                      <Notice tone="danger" message={t('home.suspended')} />
                    ) : null}
                    <View>
                      {(REVIEW_STATES.includes(shop.status)
                        ? (['review', ...SECTIONS] as ShopSection[])
                        : SECTIONS
                      ).map((section) => (
                        <ListRow
                          key={section}
                          title={t(`home.sections.${section}`)}
                          onPress={() => onOpen(shop.id, section)}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </QueryView>
            ) : null}
            {home.barberProfiles.length > 0 ? (
              <View>
                <Text variant="label" color="textSecondary">
                  {t('home.asBarber')}
                </Text>
                {home.barberProfiles
                  .filter((p) => p.isActive)
                  .flatMap((profile) => [
                    <ListRow
                      key={`${profile.barberId}-blocks`}
                      title={t('home.myBlocks', { name: profile.barbershop.name })}
                      onPress={() =>
                        onOpenAsBarber(
                          profile.barbershop.id,
                          profile.barberId,
                          'blocks',
                          profile.barbershop.timezone,
                        )
                      }
                    />,
                    <ListRow
                      key={`${profile.barberId}-hours`}
                      title={t('home.mySchedule', { name: profile.barbershop.name })}
                      onPress={() =>
                        onOpenAsBarber(
                          profile.barbershop.id,
                          profile.barberId,
                          'hours',
                          profile.barbershop.timezone,
                        )
                      }
                    />,
                  ])}
              </View>
            ) : null}
            <View style={styles.actions}>
              {home.shops.length > 0 ? (
                <Button label={t('home.create')} variant="secondary" onPress={onCreate} />
              ) : null}
              <Button label={t('home.invitations')} variant="ghost" onPress={onInvitations} />
            </View>
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  chips: { gap: spacing.sm },
  header: { gap: spacing.xs },
  pills: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  actions: { gap: spacing.sm },
});
