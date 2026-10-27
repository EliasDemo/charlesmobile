import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
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
  | 'invoicing'
  | 'money'
  | 'seller';

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
  {
    key: 'business',
    sections: ['money', 'seller', 'clients', 'reports', 'memberships', 'catalog', 'invoicing'],
  },
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
  money: 'wallet',
  seller: 'card',
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
      { target: 'shop.jobBoard', key: 'jobBoard' },
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
                <TourTarget id="shop.jobBoard">{jobBoardSlot('primary')}</TourTarget>
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
                    <View
                      style={[
                        styles.hero,
                        { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl },
                      ]}
                    >
                      <View style={[styles.logoRing, { borderColor: theme.colors.brandAccent }]}>
                        <Monogram name={shop.name} size={sizes.avatar} imageUrl={shop.logoUrl} />
                      </View>
                      <View style={styles.flex}>
                        <Text variant="title" color="onBrand" numberOfLines={2}>
                          {shop.name}
                        </Text>
                        <Text variant="caption" color="brandAccent" numberOfLines={1}>
                          {t(`home.role.${shop.myRole}`)} · {t(`type.${shop.type}`)}
                        </Text>
                        <StatusPill
                          tone={STATUS_STYLE[shop.status].tone}
                          icon={STATUS_STYLE[shop.status].icon}
                          label={t(`status.${shop.status}`)}
                        />
                      </View>
                    </View>
                    <ReadinessCard
                      shopId={shop.id}
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
                        <View
                          style={[
                            styles.iconGrid,
                            { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg },
                          ]}
                        >
                          {group.sections.map((section, index) => (
                            <FadeIn key={section} index={g * 3 + index} style={styles.iconCell}>
                              <SectionIcon
                                icon={SECTION_ICON[section]}
                                label={t(`home.sections.${section}`)}
                                hint={t(`home.sectionHints.${section}`)}
                                onPress={() => onOpen(shop.id, section)}
                              />
                            </FadeIn>
                          ))}
                        </View>
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

/** A section as a phone shortcut: icon in a rounded square, the name below (the hint is read aloud). */
function SectionIcon({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={styles.iconButton}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.iconSquare,
              {
                backgroundColor: pressed ? theme.colors.primary : theme.colors.primarySoft,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Icon
              name={icon}
              size={sizes.icon + spacing.xs}
              color={pressed ? theme.colors.onPrimary : theme.colors.primary}
            />
          </View>
          <Text variant="caption" align="center" numberOfLines={2}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  logoRing: { borderWidth: 3, borderRadius: sizes.avatar, padding: spacing.xxs },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: spacing.sm },
  iconCell: { width: '33.33%' },
  iconButton: { alignItems: 'center', gap: spacing.xs, padding: spacing.sm, minHeight: touchTarget * 2 },
  iconSquare: {
    width: touchTarget + spacing.xs,
    height: touchTarget + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { gap: spacing.sm },
  header: { gap: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  cell: { flexGrow: 1, flexBasis: '40%' },
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm },
});
