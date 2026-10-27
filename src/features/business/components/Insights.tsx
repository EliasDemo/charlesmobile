import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Button, Card, Notice, QueryView, SegmentedControl, Text } from '@/shared/ui';
import type { Heatmap, MonthlyReport } from '../api/businessApi';
import { useInsights, type InsightsTab } from '../hooks/useInsights';
import { PEN, Stat, StatRow } from './BusinessParts';

const BAR_AREA = sizes.mapPreview / 2;
const MIN_BAR = 2;
const HEAT_STEPS = [0.12, 0.3, 0.5, 0.75, 1] as const;

/**
 * "Tendencias" under the sales report: by month (bars), by hour (heat map) and "Tu zona"
 * (averages of nearby barbershops, never their names). The numbers are the backend's; the app only
 * draws them. Without a plan with full reports, "Mejora tu plan".
 */
export function InsightsSection({ shopId, onUpgrade }: { shopId: string; onUpgrade?: () => void }) {
  const { t } = useTranslation('business');
  const [tab, setTab] = useState<InsightsTab>('monthly');
  const i = useInsights(shopId, tab);
  return (
    <View style={styles.section}>
      <Text variant="subtitle">{t('insights.title')}</Text>
      <SegmentedControl
        label={t('insights.title')}
        hideLabel
        value={tab}
        onChange={setTab}
        options={[
          { value: 'monthly', label: t('insights.monthly') },
          { value: 'heatmap', label: t('insights.heatmap') },
          { value: 'market', label: t('insights.market') },
        ]}
      />
      {i.needsPlan ? (
        <Notice tone="info" title={t('insights.planTitle')} message={t('insights.planText')}>
          {onUpgrade ? <Button label={t('insights.upgrade')} icon="rocket" onPress={onUpgrade} /> : null}
        </Notice>
      ) : tab === 'monthly' ? (
        <QueryView query={i.monthly} isEmpty={(m) => m.months.length === 0}>
          {(m) => <MonthlyChart report={m} />}
        </QueryView>
      ) : tab === 'heatmap' ? (
        <QueryView query={i.heatmap} isEmpty={(h) => h.cells.length === 0}>
          {(h) => <HeatGrid map={h} />}
        </QueryView>
      ) : (
        <QueryView query={i.market}>
          {(m) => (
            <Card style={styles.section}>
              <Text color="textSecondary">
                {t('insights.zone', {
                  count: m.competitors,
                  km: m.radiusKm,
                  place: m.location ? m.location.district : t('insights.yourArea'),
                })}
              </Text>
              <StatRow>
                <Stat
                  label={t('insights.myPrice')}
                  value={m.myHaircutPrice !== null ? PEN(m.myHaircutPrice) : '—'}
                  tone="primary"
                />
                <Stat
                  label={t('insights.zonePrice')}
                  value={m.zoneHaircutPrice !== null ? PEN(m.zoneHaircutPrice) : '—'}
                />
                <Stat
                  label={t('insights.myRating')}
                  value={m.myRating !== null ? m.myRating.toFixed(1) : '—'}
                  tone="primary"
                />
                <Stat
                  label={t('insights.zoneRating')}
                  value={m.zoneRating !== null ? m.zoneRating.toFixed(1) : '—'}
                />
              </StatRow>
              {m.myRatingRank !== null ? (
                <Text variant="bodyStrong">{t('insights.rank', { rank: m.myRatingRank })}</Text>
              ) : null}
              {m.topStyles.length > 0 ? (
                <View style={styles.list}>
                  <Text variant="label" color="textSecondary">
                    {t('insights.topStyles')}
                  </Text>
                  {m.topStyles.map((s, idx) => (
                    <Text
                      key={s.key}
                    >{`${idx + 1}. ${s.name} · ${t('insights.bookings', { count: s.count })}`}</Text>
                  ))}
                </View>
              ) : null}
            </Card>
          )}
        </QueryView>
      )}
    </View>
  );
}

const monthLabel = (month: string, locale: string) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' });

/** One series (total by month): a single hue, bars from the baseline, the chosen one in detail. */
function MonthlyChart({ report }: { report: MonthlyReport }) {
  const { t, i18n } = useTranslation('business');
  const theme = useTheme();
  const [selected, setSelected] = useState(report.months.length - 1);
  const max = Math.max(...report.months.map((m) => m.totalAmount), 1);
  const month = report.months[selected] ?? report.months[report.months.length - 1]!;
  return (
    <Card style={styles.section}>
      <View style={styles.bars} accessibilityRole="summary">
        {report.months.map((m, idx) => {
          const active = idx === selected;
          const height = Math.max(MIN_BAR, (m.totalAmount / max) * BAR_AREA);
          return (
            <Pressable
              key={m.month}
              accessibilityRole="button"
              accessibilityLabel={t('insights.barLabel', {
                month: monthLabel(m.month, i18n.language),
                amount: PEN(m.totalAmount),
              })}
              accessibilityState={{ selected: active }}
              onPress={() => setSelected(idx)}
              style={styles.barSlot}
            >
              <View
                style={{
                  height,
                  backgroundColor: theme.colors.primary,
                  opacity: active ? 1 : 0.45,
                  borderTopLeftRadius: spacing.xs,
                  borderTopRightRadius: spacing.xs,
                }}
              />
              <Text
                variant="caption"
                color={active ? 'textPrimary' : 'textMuted'}
                align="center"
                numberOfLines={1}
              >
                {monthLabel(m.month, i18n.language)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.detail, { borderColor: theme.colors.border }]}>
        <Text variant="bodyStrong">{monthLabel(month.month, i18n.language)}</Text>
        <StatRow>
          <Stat label={t('reports.total')} value={PEN(month.totalAmount)} tone="primary" />
          <Stat label={t('reports.count')} value={String(month.count)} />
          <Stat label={t('reports.ticket')} value={PEN(month.averageTicket)} />
          <Stat
            label={t('insights.growth')}
            value={
              month.growthPct !== null
                ? `${month.growthPct > 0 ? '+' : ''}${month.growthPct.toFixed(0)} %`
                : '—'
            }
          />
          <Stat label={t('reports.app')} value={PEN(month.appAmount)} />
          <Stat label={t('reports.local')} value={PEN(month.localAmount)} />
        </StatRow>
        <Text variant="caption" color="textSecondary">
          {t('reports.clientsValue', { new: month.newClients, returning: month.returningClients })}
        </Text>
      </View>
      <Text color="textSecondary">
        {t('insights.average', { amount: PEN(report.monthlyAverage) })}
        {report.bestMonth
          ? ` · ${t('insights.best', { month: monthLabel(report.bestMonth, i18n.language) })}`
          : ''}
        {report.worstMonth
          ? ` · ${t('insights.worst', { month: monthLabel(report.worstMonth, i18n.language) })}`
          : ''}
      </Text>
      {report.yearOverYearPct !== null ? (
        <Text color="textSecondary">{t('insights.yoy', { pct: report.yearOverYearPct.toFixed(0) })}</Text>
      ) : null}
      {report.serviceTrends.length > 0 ? (
        <View style={styles.list}>
          <Text variant="label" color="textSecondary">
            {t('insights.trends')}
          </Text>
          {report.serviceTrends.map((s) => (
            <Text key={s.name}>
              {s.changePct !== null
                ? t('insights.trend', {
                    name: s.name,
                    pct: `${s.changePct > 0 ? '+' : ''}${s.changePct.toFixed(0)}`,
                  })
                : s.name}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** Weekday × hour of Lima: one hue, lighter = calmer; tap a cell to read it. */
function HeatGrid({ map }: { map: Heatmap }) {
  const { t } = useTranslation('business');
  const theme = useTheme();
  const days = t('insights.weekdays', { returnObjects: true }) as string[];
  const hours = [...new Set(map.cells.map((c) => c.hour))].sort((a, b) => a - b);
  const max = Math.max(...map.cells.map((c) => c.count), 1);
  const count = (weekday: number, hour: number) =>
    map.cells.find((c) => c.weekday === weekday && c.hour === hour)?.count ?? 0;
  const [picked, setPicked] = useState<{ weekday: number; hour: number } | null>(null);
  // Monday first, as people read a week (the API uses 0 = Sunday).
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <Card style={styles.section}>
      <Text color="textSecondary">{t('insights.heatIntro', { days: map.days })}</Text>
      <View style={styles.heat}>
        <View style={styles.heatRow}>
          <View style={styles.heatLabel} />
          {order.map((d) => (
            <Text key={d} variant="caption" color="textMuted" style={styles.heatCellText} align="center">
              {days[d]}
            </Text>
          ))}
        </View>
        {hours.map((h) => (
          <View key={h} style={styles.heatRow}>
            <Text variant="caption" color="textMuted" style={styles.heatLabel}>
              {`${String(h).padStart(2, '0')}h`}
            </Text>
            {order.map((d) => {
              const c = count(d, h);
              const step =
                c === 0
                  ? 0
                  : HEAT_STEPS[Math.min(HEAT_STEPS.length - 1, Math.floor((c / max) * HEAT_STEPS.length))]!;
              const active = picked?.weekday === d && picked.hour === h;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityLabel={t('insights.cell', { day: days[d], hour: h, count: c })}
                  onPress={() => setPicked({ weekday: d, hour: h })}
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor: c === 0 ? theme.colors.surfaceMuted : theme.colors.primary,
                      opacity: c === 0 ? 1 : step,
                      borderColor: active ? theme.colors.textPrimary : theme.colors.surface,
                      borderRadius: spacing.xs,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      {picked ? (
        <Text variant="bodyStrong">
          {t('insights.cell', {
            day: days[picked.weekday],
            hour: picked.hour,
            count: count(picked.weekday, picked.hour),
          })}
        </Text>
      ) : null}
      {map.busiestWeekday !== null && map.busiestHour !== null ? (
        <Text>{t('insights.busiest', { day: days[map.busiestWeekday], hour: map.busiestHour })}</Text>
      ) : null}
      {map.quietSlots.length > 0 ? (
        <Text color="textSecondary">
          {t('insights.quiet', {
            slots: map.quietSlots
              .slice(0, 3)
              .map((q) => `${days[q.weekday]} ${String(q.hour).padStart(2, '0')}h`)
              .join(', '),
          })}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: { gap: spacing.xs },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xxs, height: BAR_AREA + spacing.xl },
  barSlot: { flex: 1, justifyContent: 'flex-end', gap: spacing.xxs, minHeight: BAR_AREA + spacing.xl },
  detail: { gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
  heat: { gap: spacing.xxs },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  heatLabel: { width: spacing.xxxl - spacing.sm },
  heatCellText: { flex: 1 },
  heatCell: { flex: 1, height: spacing.xl, borderWidth: 2 },
});
