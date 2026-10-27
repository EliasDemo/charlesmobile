import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useServicesQuery } from '@/features/barbershop';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate, formatMoney } from '@/shared/lib';
import { spacing, useTheme, type StatusTone } from '@/shared/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  Notice,
  QueryView,
  Screen,
  StatusPill,
  SwitchRow,
  Text,
  TextField,
  useSurfaceStyle,
  type IconName,
} from '@/shared/ui';
import type { Membership, MembershipPlan } from '../api/membershipsApi';
import {
  useMembershipPlans,
  useMyMemberships,
  usePayWithCredit,
  useShopMemberships,
  useSubscribeMembership,
} from '../hooks/useMemberships';

const zone = env.defaultTimeZone;

const STATUS: Record<Membership['status'], { tone: StatusTone; icon: IconName }> = {
  PENDING: { tone: 'pending', icon: 'time' },
  ACTIVE: { tone: 'success', icon: 'checkmark-circle' },
  PAST_DUE: { tone: 'danger', icon: 'alert-circle' },
  CANCELED: { tone: 'neutral', icon: 'close-circle' },
  EXPIRED: { tone: 'neutral', icon: 'time' },
};

function PlanCard({ plan, action }: { plan: MembershipPlan; action?: React.ReactNode }) {
  const { t } = useTranslation('memberships');
  const surface = useSurfaceStyle();
  return (
    <View style={[styles.plan, surface]}>
      <Text variant="subtitle">{plan.name}</Text>
      <Text variant="title" color="primary">
        {t('pricePerMonth', { price: formatMoney({ amount: plan.priceAmount, currency: plan.currency }) })}
      </Text>
      <Text>{t('credits', { count: plan.creditsPerPeriod })}</Text>
      {plan.services.length > 0 ? (
        <Text variant="caption" color="textSecondary">
          {t('forServices', { services: plan.services.map((s) => s.name).join(', ') })}
        </Text>
      ) : (
        <Text variant="caption" color="textSecondary">
          {t('anyService')}
        </Text>
      )}
      {plan.description ? <Text color="textSecondary">{plan.description}</Text> : null}
      {action}
    </View>
  );
}

/** "Membresías" on a barbershop's profile: shown only when it offers some. */
export function MembershipPlansSection({
  barbershopId,
  onRequireLogin,
}: {
  barbershopId: string;
  onRequireLogin: () => void;
}) {
  const { t } = useTranslation('memberships');
  const plans = useMembershipPlans(barbershopId);
  const sub = useSubscribeMembership({ onRequireLogin });
  const active = (plans.data ?? []).filter((p) => p.isActive);
  if (active.length === 0) return null;
  return (
    <View style={styles.section} testID="membership-plans">
      <Text variant="subtitle">{t('title')}</Text>
      <Text color="textSecondary">{t('intro')}</Text>
      {sub.error ? <Notice tone="danger" message={sub.error} /> : null}
      {active.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          action={
            <Button
              label={t('subscribe')}
              onPress={() => sub.subscribe(plan.id)}
              loading={sub.subscribing === plan.id}
            />
          }
        />
      ))}
    </View>
  );
}

/** "Mis membresías": credits left, when they expire, and cancelling. */
export function MyMembershipsScreen({ onOpenShop }: { onOpenShop: (barbershopId: string) => void }) {
  const { t } = useTranslation('memberships');
  const theme = useTheme();
  const mine = useMyMemberships();
  const [cancelling, setCancelling] = useState<Membership | null>(null);
  return (
    <Screen>
      {mine.error ? <Notice tone="danger" message={mine.error} /> : null}
      <QueryView
        query={mine.query}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('empty'), message: t('emptyMessage'), icon: 'card-outline' }}
      >
        {(items) => (
          <View style={styles.list}>
            {items.map((m) => (
              <Card key={m.id}>
                <View style={styles.row}>
                  <Text variant="subtitle" style={styles.flex}>
                    {m.plan.name}
                  </Text>
                  <StatusPill
                    tone={STATUS[m.status].tone}
                    icon={STATUS[m.status].icon}
                    label={t(`status.${m.status}`)}
                  />
                </View>
                <Button
                  label={m.barbershopName}
                  variant="ghost"
                  onPress={() => onOpenShop(m.plan.barbershopId)}
                />
                <View
                  style={[
                    styles.credits,
                    { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.lg },
                  ]}
                >
                  <Text variant="hero" color="primary">
                    {m.credits}
                  </Text>
                  <Text color="primary">{t('creditsLeft', { count: m.credits })}</Text>
                </View>
                {m.nextCreditsExpireAt ? (
                  <Text variant="caption" color="textSecondary">
                    {t('expire', { date: formatLongDate(m.nextCreditsExpireAt, zone) })}
                  </Text>
                ) : null}
                {m.currentPeriodEnd ? (
                  <Text variant="caption" color="textSecondary">
                    {t(m.cancelAtPeriodEnd ? 'endsOn' : 'renewsOn', {
                      date: formatLongDate(m.currentPeriodEnd, zone),
                    })}
                  </Text>
                ) : null}
                {m.status === 'ACTIVE' && !m.cancelAtPeriodEnd ? (
                  <Button label={t('cancel')} variant="ghost" onPress={() => setCancelling(m)} />
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </QueryView>
      <ConfirmDialog
        visible={cancelling !== null}
        title={t('cancelTitle')}
        message={t('cancelMessage')}
        confirmLabel={t('cancel')}
        destructive
        loading={mine.isCancelling}
        onConfirm={() => {
          if (cancelling) mine.cancel(cancelling.id);
          setCancelling(null);
        }}
        onCancel={() => setCancelling(null)}
      />
    </Screen>
  );
}

/** "Pagar con crédito" inside a pending booking (only when there is a usable membership). */
export function PayWithCreditButton({
  bookingId,
  barbershopId,
  onPaid,
}: {
  bookingId: string;
  barbershopId: string;
  onPaid: () => void;
}) {
  const { t } = useTranslation('memberships');
  const pay = usePayWithCredit(bookingId, barbershopId, { onPaid });
  if (!pay.membership) return null;
  return (
    <View style={styles.section}>
      {pay.error ? <Notice tone="danger" message={pay.error} /> : null}
      <Button
        label={t('payWithCredit', { count: pay.membership.credits })}
        variant="secondary"
        icon="card"
        onPress={() => pay.pay(pay.membership!.id)}
        loading={pay.isPaying}
        fullWidth
      />
    </View>
  );
}

/** The barbershop's memberships: plans (create, pause) and members with their credits. */
export function ShopMembershipsScreen({ shopId, isOwner }: { shopId: string; isOwner: boolean }) {
  const { t } = useTranslation('memberships');
  const m = useShopMemberships(shopId);
  const services = useServicesQuery(shopId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [credits, setCredits] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const priceCents = Math.round(Number(price.replace(',', '.')) * 100);
  const valid =
    name.trim().length >= 3 && Number.isFinite(priceCents) && priceCents > 0 && Number(credits) >= 1;
  return (
    <Screen>
      {m.error ? <Notice tone="danger" message={m.error} /> : null}
      {isOwner ? (
        creating ? (
          <Card>
            <Text variant="subtitle">{t('shop.new')}</Text>
            <TextField label={t('shop.name')} value={name} onChangeText={setName} maxLength={80} />
            <TextField
              label={t('shop.price')}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              maxLength={8}
            />
            <TextField
              label={t('shop.credits')}
              hint={t('shop.creditsHint')}
              value={credits}
              onChangeText={(v) => setCredits(v.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text variant="label" color="textSecondary">
              {t('shop.services')}
            </Text>
            <View style={styles.chips}>
              {(services.data ?? []).map((s) => {
                const on = serviceIds.includes(s.id);
                return (
                  <Chip
                    key={s.id}
                    label={s.name}
                    selected={on}
                    onPress={() =>
                      setServiceIds(on ? serviceIds.filter((id) => id !== s.id) : [...serviceIds, s.id])
                    }
                  />
                );
              })}
            </View>
            <Button
              label={t('shop.create')}
              disabled={!valid}
              loading={m.isCreating}
              onPress={() =>
                m.create(
                  {
                    name: name.trim(),
                    priceAmount: priceCents,
                    creditsPerPeriod: Number(credits),
                    ...(serviceIds.length ? { serviceIds } : {}),
                  },
                  () => setCreating(false),
                )
              }
            />
            <Button label={t('shop.cancelNew')} variant="ghost" onPress={() => setCreating(false)} />
          </Card>
        ) : (
          <Button label={t('shop.new')} icon="add-circle" onPress={() => setCreating(true)} />
        )
      ) : null}
      <QueryView
        query={m.plans}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('shop.empty'), message: t('shop.emptyMessage'), icon: 'card-outline' }}
      >
        {(plans) => (
          <View style={styles.list}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                action={
                  <>
                    <Badge label={t('shop.members', { count: plan.activeMembers })} />
                    {isOwner ? (
                      <SwitchRow
                        title={t('shop.active')}
                        value={plan.isActive}
                        onValueChange={(on) => m.setActive(plan.id, on)}
                      />
                    ) : null}
                  </>
                }
              />
            ))}
          </View>
        )}
      </QueryView>
      <Text variant="subtitle">{t('shop.membersTitle')}</Text>
      <QueryView
        query={m.members}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('shop.noMembers'), icon: 'people-outline' }}
      >
        {(members) => (
          <View style={styles.list}>
            {members.map((member) => (
              <Card key={member.membershipId}>
                <View style={styles.row}>
                  <Text variant="bodyStrong" style={styles.flex}>{`@${member.username}`}</Text>
                  <StatusPill
                    tone={STATUS[member.status].tone}
                    icon={STATUS[member.status].icon}
                    label={t(`status.${member.status}`)}
                  />
                </View>
                <Text color="textSecondary">
                  {t('shop.memberLine', { plan: member.planName, count: member.credits })}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  section: { gap: spacing.sm },
  plan: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  credits: { alignItems: 'center', padding: spacing.md, gap: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
