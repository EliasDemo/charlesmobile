import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, formatShortDate } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  InfoCard,
  Notice,
  QueryView,
  Screen,
  StatusPill,
  Text,
  type IconName,
} from '@/shared/ui';
import type { StatementLine } from '../api/businessApi';
import { STATEMENT_RANGES, useMoney, useSellerAccount } from '../hooks/useMoney';

const KIND_ICON: Record<StatementLine['kind'], IconName> = {
  BOOKING: 'calendar',
  BOOKING_DIRECT: 'card',
  REFUND: 'arrow-undo',
  MEMBERSHIP: 'ribbon',
  SUBSCRIPTION_PAYMENT: 'rocket',
  PAYOUT: 'arrow-down-circle',
  ADJUSTMENT: 'construct',
};

/** "Mi dinero": the three numbers the backend gives, then every movement of the period. */
export function MoneyScreen({ shopId, onOpenSeller }: { shopId: string; onOpenSeller: () => void }) {
  const { t } = useTranslation('business');
  const m = useMoney(shopId);
  const zone = env.defaultTimeZone;
  return (
    <Screen refreshing={m.balance.isRefetching} onRefresh={() => void m.balance.refetch()}>
      <QueryView query={m.balance}>
        {(b) => {
          const money = (amount: number) => formatMoney({ amount, currency: b.currency });
          return (
            <View style={styles.content}>
              <Card style={styles.hero}>
                <Text variant="caption" color="textSecondary">
                  {t('money.available')}
                </Text>
                <Text variant="hero" color="primary">
                  {money(b.available)}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {t('money.availableHint')}
                </Text>
              </Card>
              <View style={styles.row}>
                <Card style={styles.half}>
                  <Text variant="caption" color="textSecondary">
                    {t('money.pending')}
                  </Text>
                  <Text variant="subtitle">{money(b.pending)}</Text>
                  <Text variant="caption" color="textMuted">
                    {t('money.pendingHint')}
                  </Text>
                </Card>
                <Card style={styles.half}>
                  <Text variant="caption" color="textSecondary">
                    {t('money.direct')}
                  </Text>
                  <Text variant="subtitle">{money(b.paidDirect)}</Text>
                  <Text variant="caption" color="textMuted">
                    {t('money.directHint')}
                  </Text>
                </Card>
              </View>
              {!b.sellerConnected ? (
                <Notice tone="info" title={t('money.sellerTitle')} message={t('money.sellerText')}>
                  <Button label={t('seller.connect')} variant="secondary" onPress={onOpenSeller} />
                </Notice>
              ) : null}
            </View>
          );
        }}
      </QueryView>
      <Text variant="subtitle">{t('money.movements')}</Text>
      <View style={styles.chips}>
        {STATEMENT_RANGES.map((r) => (
          <Chip
            key={r}
            label={t('money.range', { count: r })}
            selected={m.range === r}
            onPress={() => m.setRange(r)}
          />
        ))}
      </View>
      <QueryView
        query={m.statement}
        isEmpty={(s) => s.lines.length === 0}
        empty={{ title: t('money.empty'), icon: 'receipt-outline' }}
      >
        {(s) => {
          const money = (amount: number) => formatMoney({ amount, currency: s.balance.currency });
          return (
            <View style={styles.content}>
              <Card style={styles.totals}>
                <Total label={t('money.gross')} value={money(s.gross)} />
                <Total label={t('money.commission')} value={money(s.commission)} />
                <Total label={t('money.net')} value={money(s.net)} strong />
              </Card>
              {s.lines.map((line, i) => (
                <InfoCard
                  key={`${line.at}-${i}`}
                  leading={
                    <StatusPill
                      tone={
                        line.net < 0
                          ? 'danger'
                          : line.state === 'PENDING'
                            ? 'pending'
                            : line.state === 'INFO'
                              ? 'neutral'
                              : 'success'
                      }
                      icon={KIND_ICON[line.kind]}
                      label={t(`money.kind.${line.kind}`)}
                    />
                  }
                  title={line.description}
                  subtitle={`${formatShortDate(line.at, zone)} · ${t(`money.state.${line.state}`)}`}
                  details={[
                    ...(line.gross
                      ? [{ icon: 'cash' as const, text: t('money.lineGross', { amount: money(line.gross) }) }]
                      : []),
                    ...(line.commission
                      ? [
                          {
                            icon: 'pricetag' as const,
                            text: t('money.lineCommission', { amount: money(line.commission) }),
                          },
                        ]
                      : []),
                  ]}
                  trailing={
                    <Text
                      variant="bodyStrong"
                      color={line.net < 0 ? 'danger' : line.net > 0 ? 'success' : 'textSecondary'}
                    >
                      {line.net > 0 ? `+${money(line.net)}` : money(line.net)}
                    </Text>
                  }
                />
              ))}
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.total}>
      <Text color="textSecondary">{label}</Text>
      <Text variant={strong ? 'subtitle' : 'bodyStrong'}>{value}</Text>
    </View>
  );
}

/** "Cobrar directo con Mercado Pago": state, connect (external browser) and disconnect. */
export function SellerAccountScreen({ shopId }: { shopId: string }) {
  const { t } = useTranslation('business');
  const s = useSellerAccount(shopId);
  const [confirming, setConfirming] = useState(false);
  const zone = env.defaultTimeZone;
  return (
    <Screen refreshing={s.query.isRefetching} onRefresh={() => void s.query.refetch()}>
      <Text color="textSecondary">{t('seller.intro')}</Text>
      {s.error ? <Notice tone="danger" message={s.error} /> : null}
      <QueryView query={s.query}>
        {(account) => (
          <Card style={styles.content}>
            <StatusPill
              tone={
                account.status === 'CONNECTED'
                  ? 'success'
                  : account.status === 'PENDING'
                    ? 'pending'
                    : account.status === 'REVOKED'
                      ? 'danger'
                      : 'neutral'
              }
              icon={account.status === 'CONNECTED' ? 'checkmark-circle' : 'link'}
              label={t(`seller.status.${account.status}`)}
            />
            <Text>{t(`seller.text.${account.status}`)}</Text>
            {account.connectedAt ? (
              <Text variant="caption" color="textSecondary">
                {t('seller.since', { date: formatShortDate(account.connectedAt, zone) })}
              </Text>
            ) : null}
            {account.status === 'CONNECTED' ? (
              <Button
                label={t('seller.disconnect')}
                variant="ghost"
                onPress={() => setConfirming(true)}
                loading={s.isDisconnecting}
              />
            ) : (
              <Button
                label={t('seller.connect')}
                icon="open"
                onPress={s.connect}
                loading={s.isConnecting}
                fullWidth
              />
            )}
          </Card>
        )}
      </QueryView>
      <ConfirmDialog
        visible={confirming}
        title={t('seller.disconnectTitle')}
        message={t('seller.disconnectMessage')}
        confirmLabel={t('seller.disconnect')}
        destructive
        onConfirm={() => {
          setConfirming(false);
          s.disconnect();
        }}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  hero: { gap: spacing.xs, alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1, gap: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  totals: { gap: spacing.sm },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
