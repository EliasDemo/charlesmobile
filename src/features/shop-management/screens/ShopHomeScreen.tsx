import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  ActionTile,
  FadeIn,
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
  TourTarget,
  useFirstTimeTour,
} from '@/shared/ui';
import type { ManagedShop } from '../api/shopApi';
import { ReadinessCard } from '../components/ReadinessCard';
import { useShopHome } from '../hooks/useShopHome';
import { REVIEW_STATES } from '../hooks/useShopReview';

export type ShopSection =
  | 'review'
  | 'reviews'
  | 'gallery'
  | 'details'
  | 'status'
  | 'services'
  | 'barbers'
  | 'members'
  | 'hours'
  | 'blocks'
  | 'promotions'
  | 'jobs'
  | 'talent'
  | 'videos'
  | 'plan'
  | 'memberships'
  | 'cash'
  | 'sales'
  | 'clients'
  | 'catalog'
  | 'reports'
  | 'invoicing';

export interface ShopHomeScreenProps {
  /** Action on the right of the title (the notifications bell, given by the route). */
  headerRight?: ReactNode;
  /** Sponsor space at the end of the panel ("shop_dashboard"). */
  bottomSlot?: ReactNode;
  /** "Hoy" at the top of the panel: register, sales and a quick "Nueva venta" (business feature). */
  todaySlot?: (shopId: string) => ReactNode;
  /**
   * "Bolsa laboral" for barbers: `primary` (no barbershop yet, looking for work: shown first) or
   * `subtle` (already working somewhere: a quiet entry at the end). Owners do not get it.
   */
  jobBoardSlot?: (variant: 'primary' | 'subtle') => ReactNode;
  onCreate: () => void;
  onInvitations: () => void;
  onOpen: (shopId: string, section: ShopSection) => void;
  /** A barber's own blocks or hours in a barbershop they work at. */
  onOpenAsBarber: (
    shopId: string,
    barberId: string,
    section: 'blocks' | 'hours' | 'gallery',
    timeZone: string,
  ) => void;
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

/** The panel in groups, so 25 sections read at a glance. */
const GROUPS: { key: 'day' | 'team' | 'business' | 'marketing' | 'settings'; sections: ShopSection[] }[] = [
  { key: 'day', sections: ['cash', 'sales', 'blocks'] },
  { key: 'team', sections: ['barbers', 'hours', 'services', 'members', 'jobs', 'talent'] },
  { key: 'business', sections: ['clients', 'reports', 'memberships', 'catalog', 'invoicing'] },
  { key: 'marketing', sections: ['promotions', 'gallery', 'videos', 'reviews'] },
  { key: 'settings', sections: ['details', 'status', 'plan'] },
];

const SECTION_ICON: Record<ShopSection, IconName> = {
  review: 'document-text',
  reviews: 'star',
  gallery: 'images',
  details: 'storefront',
  status: 'power',
  services: 'cut',
  barbers: 'people',
  members: 'shield-checkmark',
  hours: 'time',
  blocks: 'calendar-clear',
  promotions: 'pricetag',
  jobs: 'briefcase',
  talent: 'person-add',
  videos: 'videocam',
  plan: 'rocket',
  memberships: 'card',
  cash: 'cash',
  sales: 'receipt',
  clients: 'people-circle',
  catalog: 'albums',
  reports: 'bar-chart',
  invoicing: 'document-text',
};

export function ShopHomeScreen({
  onCreate,
  onInvitations,
  onOpen,
  onOpenAsBarber,
  headerRight,
  bottomSlot,
  todaySlot,
  jobBoardSlot,
}: ShopHomeScreenProps) {
  const { t } = useTranslation('shop');
  const home = useShopHome();
  useFirstTimeTour(
    'shop',
    [
      { target: 'shop.today', key: 'today' },
      { target: 'shop.groups', key: 'groups' },
    ],
    'tour',
  );
  const theme = useTheme();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenTitle title={t('home.title')} right={headerRight} />
      <QueryView query={home.mine} skeletonCount={2}>
        {() => (
          <View style={styles.content}>
            {home.seeking && jobBoardSlot ? (
              <>
                {jobBoardSlot('primary')}
                <Card style={styles.header}>
                  <Text variant="bodyStrong">{t('home.ownShopTitle')}</Text>
                  <Text color="textSecondary">{t('home.ownShopText')}</Text>
                  <Button label={t('home.create')} variant="secondary" icon="add-circle" onPress={onCreate} />
                </Card>
              </>
            ) : home.shops.length === 0 && home.barberProfiles.length === 0 ? (
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
                        <Monogram name={shop.name} size={sizes.avatar} imageUrl={shop.logoUrl} />
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
                    <ReadinessCard
                      shop={shop}
                      onFix={(target) =>
                        onOpen(
                          shop.id,
                          target === 'review' && REVIEW_STATES.includes(shop.status)
                            ? 'review'
                            : target === 'review'
                              ? 'status'
                              : target,
                        )
                      }
                    />
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
                    <TourTarget id="shop.today">{todaySlot?.(shop.id)}</TourTarget>
                    {REVIEW_STATES.includes(shop.status) ? (
                      <ActionTile
                        icon={SECTION_ICON.review}
                        label={t('home.sections.review')}
                        hint={t('home.sectionHints.review')}
                        tone="pending"
                        onPress={() => onOpen(shop.id, 'review')}
                      />
                    ) : null}
                    {GROUPS.map((group, g) => (
                      <View key={group.key} style={styles.section}>
                        <TourTarget id={g === 1 ? 'shop.groups' : `shop.group.${group.key}`}>
                          <Text variant="label" color="textSecondary">
                            {t(`home.groups.${group.key}`)}
                          </Text>
                        </TourTarget>
                        <TileGrid>
                          {group.sections.map((section, index) => (
                            <FadeIn key={section} index={g * 3 + index} style={styles.cell}>
                              <ActionTile
                                icon={SECTION_ICON[section]}
                                label={t(`home.sections.${section}`)}
                                hint={t(`home.sectionHints.${section}`)}
                                onPress={() => onOpen(shop.id, section)}
                              />
                            </FadeIn>
                          ))}
                        </TileGrid>
                      </View>
                    ))}
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
                      <ActionTile
                        key={`${profile.barberId}-gallery`}
                        icon="images"
                        label={t('home.sections.gallery')}
                        hint={profile.barbershop.name}
                        onPress={() =>
                          onOpenAsBarber(
                            profile.barbershop.id,
                            profile.barberId,
                            'gallery',
                            profile.barbershop.timezone,
                          )
                        }
                      />,
                    ])}
                </TileGrid>
              </View>
            ) : null}
            {home.employed && jobBoardSlot ? jobBoardSlot('subtle') : null}
            <View style={styles.actions}>
              {home.shops.length > 0 ? (
                <Button label={t('home.create')} variant="secondary" icon="add-circle" onPress={onCreate} />
              ) : null}
              <Button label={t('home.invitations')} variant="ghost" icon="mail" onPress={onInvitations} />
            </View>
            {bottomSlot}
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
  cell: { flexGrow: 1, flexBasis: '40%' },
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm },
});
