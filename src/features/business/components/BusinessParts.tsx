import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatMoney, toLocalDate } from '@/shared/lib';
import { spacing, useTheme, type StatusTone } from '@/shared/theme';
import { Chip, StatusPill, Text, useSurfaceStyle, type IconName } from '@/shared/ui';
import type { ClientTier, Invoice } from '../api/businessApi';

export const PEN = (amount: number) => formatMoney({ amount, currency: 'PEN' });

export type RangeKey = 'today' | 'week' | 'month';

const DAY_MS = 24 * 60 * 60 * 1000;

/** From and to (YYYY-MM-DD, the barbershop's local days) for a quick range. */
export function rangeFor(key: RangeKey, timeZone = env.defaultTimeZone): { from: string; to: string } {
  const now = Date.now();
  const to = toLocalDate(new Date(now).toISOString(), timeZone);
  const back = key === 'today' ? 0 : key === 'week' ? 6 : 29;
  return { from: toLocalDate(new Date(now - back * DAY_MS).toISOString(), timeZone), to };
}

/** Hoy · 7 días · 30 días. */
export function RangeChips({ value, onChange }: { value: RangeKey; onChange: (key: RangeKey) => void }) {
  const { t } = useTranslation('business');
  return (
    <View style={styles.chips}>
      {(['today', 'week', 'month'] as const).map((k) => (
        <Chip key={k} label={t(`range.${k}`)} selected={value === k} onPress={() => onChange(k)} />
      ))}
    </View>
  );
}

/** A big number with its label: the totals at the top of the panel and reports. */
export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'primary' | 'success' }) {
  const surface = useSurfaceStyle();
  return (
    <View style={[styles.stat, surface]}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="title" color={tone ?? 'textPrimary'}>
        {value}
      </Text>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

const TIER_TONE: Record<ClientTier, StatusTone> = {
  NONE: 'neutral',
  BRONZE: 'pending',
  SILVER: 'neutral',
  GOLD: 'success',
};

export function TierPill({ tier }: { tier: ClientTier }) {
  const { t } = useTranslation('business');
  if (tier === 'NONE') return null;
  return <StatusPill tone={TIER_TONE[tier]} icon="medal" label={t(`tiers.${tier}`)} />;
}

const INVOICE: Record<Invoice['status'], { tone: StatusTone; icon: IconName }> = {
  PENDING: { tone: 'pending', icon: 'time' },
  ISSUED: { tone: 'success', icon: 'document-text' },
  REJECTED: { tone: 'danger', icon: 'close-circle' },
  FAILED: { tone: 'danger', icon: 'alert-circle' },
  VOIDED: { tone: 'neutral', icon: 'ban' },
};

export function InvoicePill({ status }: { status: Invoice['status'] }) {
  const { t } = useTranslation('business');
  return (
    <StatusPill tone={INVOICE[status].tone} icon={INVOICE[status].icon} label={t(`invoice.${status}`)} />
  );
}

/** Simple bars for the amounts per day (what the report sends, nothing computed). */
export function DayBars({ days }: { days: { day: string; amount: number }[] }) {
  const theme = useTheme();
  const max = Math.max(1, ...days.map((d) => d.amount));
  return (
    <View
      style={styles.bars}
      accessible
      accessibilityLabel={days.map((d) => `${d.day}: ${PEN(d.amount)}`).join(', ')}
    >
      {days.map((d) => (
        <View key={d.day} style={styles.barCol}>
          <View
            style={{
              height: `${Math.max(4, (d.amount / max) * 100)}%`,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.sm,
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flex: 1, padding: spacing.md, gap: spacing.xxs, minWidth: '45%' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xxs, height: spacing.xxxl * 2 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
});
