import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBarbersList } from '@/features/shop-management';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate, formatMoney } from '@/shared/lib';
import { sizes, spacing, useTheme, type StatusTone } from '@/shared/theme';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Notice,
  QueryView,
  Screen,
  SegmentedControl,
  StatusPill,
  Text,
  useSurfaceStyle,
  type IconName,
} from '@/shared/ui';
import type { Plan, PlanUsage, Subscription } from '../api/plansApi';
import { usePlanBadges, usePlanCatalog, usePlanUnlock, useShopPlan } from '../hooks/usePlans';

const zone = env.defaultTimeZone;

const STATUS: Record<Subscription['status'], { tone: StatusTone; icon: IconName }> = {
  PENDING: { tone: 'pending', icon: 'mail' },
  TRIALING: { tone: 'success', icon: 'gift' },
  ACTIVE: { tone: 'success', icon: 'checkmark-circle' },
  PAST_DUE: { tone: 'danger', icon: 'alert-circle' },
  CANCELED: { tone: 'neutral', icon: 'close-circle' },
  EXPIRED: { tone: 'neutral', icon: 'time' },
};

/** A limit and how much of it is used, as a bar that turns orange near the end. */
function UsageBar({ usage }: { usage: PlanUsage }) {
  const { t } = useTranslation('plans');
  const theme = useTheme();
  const used = usage.used ?? 0;
  if (usage.kind === 'TOGGLE') {
    return (
      <View style={styles.usageRow}>
        <Text style={styles.flex}>{usage.label}</Text>
        <Badge
          label={(usage.limit ?? 1) > 0 ? t('included') : t('notIncluded')}
          tone={(usage.limit ?? 1) > 0 ? 'success' : 'neutral'}
        />
      </View>
    );
  }
  // No limit (null): unlimited.
  if (usage.limit === null) {
    return (
      <View style={styles.usageRow}>
        <Text style={styles.flex}>{usage.label}</Text>
        <Text variant="bodyStrong">{t('unlimited', { used })}</Text>
      </View>
    );
  }
  const ratio = usage.limit > 0 ? Math.min(1, used / usage.limit) : 1;
  const color = ratio >= 1 ? theme.colors.danger : ratio >= 0.8 ? theme.colors.warning : theme.colors.primary;
  return (
    <View
      style={styles.usage}
      accessible
      accessibilityLabel={t('usageLabel', { label: usage.label, used, limit: usage.limit })}
    >
      <View style={styles.usageRow}>
        <Text style={styles.flex}>{usage.label}</Text>
        <Text variant="bodyStrong">{t('usage', { used, limit: usage.limit })}</Text>
      </View>
      <View
        style={[styles.track, { backgroundColor: theme.colors.background, borderRadius: theme.radius.pill }]}
      >
        <View
          style={[
            styles.fill,
            { width: `${ratio * 100}%`, backgroundColor: color, borderRadius: theme.radius.pill },
          ]}
        />
      </View>
    </View>
  );
}

/** "Mi plan": plan in force, usage of each limit, subscription state and its actions. */
export function MyPlanScreen({
  shopId,
  isOwner,
  onChangePlan,
}: {
  shopId: string;
  isOwner: boolean;
  onChangePlan: () => void;
}) {
  const { t } = useTranslation('plans');
  const surface = useSurfaceStyle();
  const p = useShopPlan(shopId);
  usePlanUnlock(
    shopId,
    p.query.data?.plan as Plan | null | undefined,
    p.query.data?.subscription?.status === 'ACTIVE' || p.query.data?.subscription?.status === 'TRIALING',
  );
  const [cancelling, setCancelling] = useState(false);
  return (
    <Screen refreshing={p.query.isRefetching} onRefresh={() => void p.query.refetch()}>
      {p.error ? <Notice tone="danger" message={p.error} /> : null}
      <QueryView query={p.query}>
        {(data) => {
          const plan = data.plan as Plan | null;
          const sub = data.subscription as Subscription | null;
          return (
            <View style={styles.content}>
              <View style={[styles.hero, surface]}>
                <Text variant="caption" color="textSecondary">
                  {t('current')}
                </Text>
                <Text variant="title">{plan?.name ?? t('free')}</Text>
                {plan?.description ? <Text color="textSecondary">{plan.description}</Text> : null}
                {sub ? (
                  <StatusPill
                    tone={STATUS[sub.status].tone}
                    icon={STATUS[sub.status].icon}
                    label={t(`status.${sub.status}`)}
                  />
                ) : null}
                {isOwner &&
                sub &&
                (sub.status === 'PAST_DUE' || sub.status === 'ACTIVE') &&
                plan &&
                !plan.isDefault ? (
                  <Button
                    label={sub.status === 'PAST_DUE' ? t('recoverWithBalance') : t('payNextWithBalance')}
                    icon="wallet"
                    variant={sub.status === 'PAST_DUE' ? 'primary' : 'secondary'}
                    onPress={p.payWithBalance}
                    loading={p.isPayingBalance}
                  />
                ) : null}
                {sub?.status === 'PENDING' ? (
                  <Notice tone="info" message={t('pendingEmail')}>
                    <Button
                      label={t('checkPayment')}
                      variant="secondary"
                      onPress={p.checkPayment}
                      loading={p.isChecking}
                    />
                  </Notice>
                ) : null}
                {sub?.status === 'TRIALING' && sub.trialEndsAt ? (
                  <Text color="textSecondary">
                    {t('trialUntil', { date: formatLongDate(sub.trialEndsAt, zone) })}
                  </Text>
                ) : null}
                {sub?.status === 'PAST_DUE' ? (
                  <Notice
                    tone="danger"
                    message={t('pastDue', {
                      date: sub.graceUntil ? formatLongDate(sub.graceUntil, zone) : '',
                    })}
                  />
                ) : null}
                {sub?.currentPeriodEnd && (sub.status === 'ACTIVE' || sub.cancelAtPeriodEnd) ? (
                  <Text color="textSecondary">
                    {t(sub.cancelAtPeriodEnd ? 'endsOn' : 'renewsOn', {
                      date: formatLongDate(sub.currentPeriodEnd, zone),
                    })}
                  </Text>
                ) : null}
              </View>

              <Card>
                <Text variant="subtitle">{t('usageTitle')}</Text>
                {data.usage.map((u) => (
                  <UsageBar key={u.key} usage={u} />
                ))}
              </Card>

              {data.suspendedBarbers > 0 || data.hiddenPhotos > 0 ? (
                <Notice
                  tone="warning"
                  message={t('overLimit', { barbers: data.suspendedBarbers, photos: data.hiddenPhotos })}
                />
              ) : null}
              {data.suspendedBarbers > 0 && isOwner ? (
                <ActiveBarbers
                  shopId={shopId}
                  limit={data.usage.find((u) => u.key.includes('barber'))?.limit ?? 0}
                  saving={p.isSavingBarbers}
                  onSave={p.saveActiveBarbers}
                />
              ) : null}

              {isOwner ? (
                <View style={styles.section}>
                  <Button
                    label={plan ? t('changePlan') : t('seePlans')}
                    icon="rocket"
                    onPress={onChangePlan}
                    fullWidth
                  />
                  {sub && !sub.cancelAtPeriodEnd && (sub.status === 'ACTIVE' || sub.status === 'TRIALING') ? (
                    <Button label={t('cancel')} variant="ghost" onPress={() => setCancelling(true)} />
                  ) : null}
                </View>
              ) : (
                <Notice tone="info" message={t('ownerOnly')} />
              )}
            </View>
          );
        }}
      </QueryView>
      <ConfirmDialog
        visible={cancelling}
        title={t('cancelTitle')}
        message={t('cancelMessage')}
        confirmLabel={t('cancel')}
        destructive
        loading={p.isCancelling}
        onConfirm={() => {
          p.cancel();
          setCancelling(false);
        }}
        onCancel={() => setCancelling(false)}
      />
    </Screen>
  );
}

/** After moving to a smaller plan: which barbers stay active (up to the limit). */
function ActiveBarbers({
  shopId,
  limit,
  saving,
  onSave,
}: {
  shopId: string;
  limit: number;
  saving: boolean;
  onSave: (ids: string[]) => void;
}) {
  const { t } = useTranslation('plans');
  const barbers = useBarbersList(shopId);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const selected = chosen ?? (barbers.data ?? []).filter((b) => b.isActive).map((b) => b.id);
  return (
    <Card>
      <Text variant="subtitle">{t('activeBarbers', { limit })}</Text>
      {(barbers.data ?? []).map((b) => {
        const on = selected.includes(b.id);
        return (
          <Checkbox
            key={b.id}
            label={b.displayName}
            checked={on}
            onChange={(value) =>
              setChosen(
                value
                  ? selected.length < limit
                    ? [...selected, b.id]
                    : selected
                  : selected.filter((id) => id !== b.id),
              )
            }
          />
        );
      })}
      <Button
        label={t('saveBarbers')}
        onPress={() => onSave(selected)}
        loading={saving}
        disabled={selected.length === 0}
      />
    </Card>
  );
}

/**
 * Plans offered. "Contratar" asks the backend to send the payment link by email: no purchase
 * happens inside the app (Apple and Google rules).
 */
export function PlansScreen({
  shopId,
  audience,
  currentCode,
}: {
  shopId: string;
  audience: Plan['audience'];
  currentCode: string | null;
}) {
  const { t } = useTranslation('plans');
  const theme = useTheme();
  const surface = useSurfaceStyle();
  const c = usePlanCatalog(shopId, audience, currentCode);
  return (
    <Screen>
      {c.sentTo ? <Notice tone="success" message={t('sent', { plan: c.sentTo })} /> : null}
      {c.error ? <Notice tone="danger" message={c.error} /> : null}
      <SegmentedControl
        label={t('interval')}
        options={[
          { value: 'MONTHLY', label: t('monthly') },
          { value: 'YEARLY', label: t('yearly') },
        ]}
        value={c.interval}
        onChange={c.setInterval}
      />
      <QueryView query={c.query} isEmpty={(plans) => plans.length === 0} empty={{ title: t('noPlans') }}>
        {(plans) => (
          <View style={styles.content}>
            {plans.map((plan) => {
              const isCurrent = plan.code === currentCode;
              const price = c.interval === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.plan,
                    surface,
                    isCurrent
                      ? { borderColor: theme.colors.primary, borderWidth: sizes.borderWidth * 2 }
                      : null,
                  ]}
                >
                  <View style={styles.usageRow}>
                    <Text variant="title" style={styles.flex}>
                      {plan.name}
                    </Text>
                    {isCurrent ? <Badge label={t('yours')} tone="primary" /> : null}
                  </View>
                  <Text variant="hero" color="primary">
                    {price ? formatMoney({ amount: price, currency: plan.currency }) : t('freePrice')}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {t(c.interval === 'YEARLY' ? 'perYear' : 'perMonth')}
                    {plan.trialDays > 0 ? ` · ${t('trialDays', { count: plan.trialDays })}` : ''}
                  </Text>
                  {plan.description ? <Text color="textSecondary">{plan.description}</Text> : null}
                  {plan.entitlements.map((e) => (
                    <Text key={e.key}>
                      {e.kind === 'TOGGLE'
                        ? `${(e.value ?? 1) > 0 ? '✓' : '—'} ${e.label}`
                        : `✓ ${t('limitLine', { label: e.label, value: e.value ?? t('unlimitedShort') })}`}
                    </Text>
                  ))}
                  {!isCurrent ? (
                    <View style={styles.section}>
                      <Button
                        label={price ? t('payGateway') : t('choose')}
                        variant="secondary"
                        onPress={() => c.choose(plan, 'GATEWAY')}
                        loading={c.choosing === `${plan.code}:GATEWAY`}
                      />
                      {price && c.balance ? (
                        <Button
                          label={t('payBalance', {
                            amount: formatMoney({
                              amount: c.balance.available,
                              currency: c.balance.currency,
                            }),
                          })}
                          icon="wallet"
                          onPress={() => c.choose(plan, 'BALANCE')}
                          loading={c.choosing === `${plan.code}:BALANCE`}
                          disabled={c.balance.available < price}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Text variant="caption" color="textMuted" align="center">
              {t('emailNote')}
            </Text>
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  section: { gap: spacing.sm },
  hero: { padding: spacing.lg, gap: spacing.sm },
  plan: { padding: spacing.lg, gap: spacing.sm },
  usage: { gap: spacing.xs, paddingVertical: spacing.xs },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  track: { height: spacing.sm, overflow: 'hidden' },
  fill: { height: '100%' },
});

/** "Verificada" on a barbershop's profile, when its plan includes it (public). */
export function VerifiedBadge({ barbershopId }: { barbershopId: string }) {
  const { t } = useTranslation('plans');
  const badges = usePlanBadges(barbershopId);
  if (!badges.data?.verified) return null;
  return <StatusPill tone="success" icon="shield-checkmark" label={t('verified')} />;
}
