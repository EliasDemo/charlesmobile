import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  ActionTile,
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  Monogram,
  Notice,
  QueryView,
  Screen,
  ScreenTitle,
  StatusPill,
  Text,
  TileGrid,
  type IconName,
} from '@/shared/ui';
import type { ManagedShop } from '../api/shopApi';
import { useShopHome } from '../hooks/useShopHome';
import { REVIEW_STATES } from '../hooks/useShopReview';

export type ShopSection =
  'review' | 'details' | 'status' | 'services' | 'barbers' | 'members' | 'hours' | 'blocks';

export interface ShopHomeScreenProps {
  /** Action on the right of the title (the notifications bell, given by the route). */
  headerRight?: ReactNode;
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

const SECTIONS: ShopSection[] = ['services', 'barbers', 'hours', 'blocks', 'status', 'members', 'details'];

const SECTION_ICON: Record<ShopSection, IconName> = {
  review: 'document-text',
  details: 'storefront',
  status: 'power',
  services: 'cut',
  barbers: 'people',
  members: 'shield-checkmark',
  hours: 'time',
  blocks: 'calendar-clear',
};

export function ShopHomeScreen({
  onCreate,
  onInvitations,
  onOpen,
  onOpenAsBarber,
  headerRight,
}: ShopHomeScreenProps) {
  const { t } = useTranslation('shop');
  const home = useShopHome();
  const theme = useTheme();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenTitle title={t('home.title')} right={headerRight} />
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
                    <Card style={styles.header}>
                      <View style={styles.headerTop}>
                        <Monogram name={shop.name} size={sizes.avatar} />
                        <View style={styles.flex}>
                          <Text variant="title">{shop.name}</Text>
                          <Text variant="caption" color="textSecondary">
                            {t(`home.role.${shop.myRole}`)} · {t(`type.${shop.type}`)}
                          </Text>
                        </View>
                      </View>
                      <StatusPill
                        tone={STATUS_STYLE[shop.status].tone}
                        icon={STATUS_STYLE[shop.status].icon}
                        label={t(`status.${shop.status}`)}
                      />
                    </Card>
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
                    <TileGrid>
                      {(REVIEW_STATES.includes(shop.status)
                        ? (['review', ...SECTIONS] as ShopSection[])
                        : SECTIONS
                      ).map((section) => (
                        <ActionTile
                          key={section}
                          icon={SECTION_ICON[section]}
                          label={t(`home.sections.${section}`)}
                          hint={t(`home.sectionHints.${section}`)}
                          tone={section === 'review' ? 'pending' : undefined}
                          onPress={() => onOpen(shop.id, section)}
                        />
                      ))}
                    </TileGrid>
                  </View>
                )}
              </QueryView>
            ) : null}
            {home.barberProfiles.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionTitle}>
                  <Icon name="cut" size={sizes.icon} color={theme.colors.primary} />
                  <Text variant="subtitle">{t('home.asBarber')}</Text>
                </View>
                <TileGrid>
                  {home.barberProfiles
                    .filter((p) => p.isActive)
                    .flatMap((profile) => [
                      <ActionTile
                        key={`${profile.barberId}-blocks`}
                        icon="calendar-clear"
                        label={t('home.sections.blocks')}
                        hint={profile.barbershop.name}
                        onPress={() =>
                          onOpenAsBarber(
                            profile.barbershop.id,
                            profile.barberId,
                            'blocks',
                            profile.barbershop.timezone,
                          )
                        }
                      />,
                      <ActionTile
                        key={`${profile.barberId}-hours`}
                        icon="time"
                        label={t('home.sections.hours')}
                        hint={profile.barbershop.name}
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
                </TileGrid>
              </View>
            ) : null}
            <View style={styles.actions}>
              {home.shops.length > 0 ? (
                <Button label={t('home.create')} variant="secondary" icon="add-circle" onPress={onCreate} />
              ) : null}
              <Button label={t('home.invitations')} variant="ghost" icon="mail" onPress={onInvitations} />
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
  header: { gap: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm },
});
