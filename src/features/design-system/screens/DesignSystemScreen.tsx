import { useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate, formatMoney, formatTime } from '@/shared/lib';
import { typography, type TypographyVariant } from '@/shared/theme';
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, Text, TextField } from '@/shared/ui';

const SAMPLE_INSTANT = '2030-01-07T14:00:00.000Z';
const SAMPLE_TIME_ZONE = 'America/Lima';

/** Development-only catalog of the design system, to review it on a real phone. */
export function DesignSystemScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  return (
    <Screen>
      <Card>
        <Text variant="subtitle">{t('designSystem.typography')}</Text>
        {(Object.keys(typography) as TypographyVariant[]).map((variant) => (
          <Text key={variant} variant={variant}>
            {variant} · {t('designSystem.sampleText')}
          </Text>
        ))}
      </Card>
      <Card>
        <Text variant="subtitle">{t('designSystem.buttons')}</Text>
        <Button label={t('designSystem.primary')} />
        <Button label={t('designSystem.secondary')} variant="secondary" />
        <Button label={t('designSystem.ghost')} variant="ghost" />
        <Button label={t('designSystem.danger')} variant="danger" />
        <Button label={t('designSystem.loading')} loading />
        <Button label={t('designSystem.disabled')} disabled />
      </Card>
      <Card>
        <Text variant="subtitle">{t('designSystem.fields')}</Text>
        <TextField
          label={t('designSystem.fieldLabel')}
          placeholder={t('designSystem.fieldPlaceholder')}
          hint={t('designSystem.fieldHint')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextField label={t('designSystem.fieldLabel')} error={t('designSystem.fieldError')} />
      </Card>
      <Card>
        <Text variant="subtitle">{t('designSystem.money')}</Text>
        <Text>{formatMoney({ amount: 2500, currency: 'PEN' })}</Text>
        <Text>
          {formatLongDate(SAMPLE_INSTANT, SAMPLE_TIME_ZONE)} · {formatTime(SAMPLE_INSTANT, SAMPLE_TIME_ZONE)}
        </Text>
      </Card>
      <Card>
        <Text variant="subtitle">{t('designSystem.states')}</Text>
        <LoadingState />
        <EmptyState message={t('designSystem.emptyMessage')} />
        <ErrorState message={t('network', { ns: 'errors' })} onRetry={() => undefined} />
      </Card>
    </Screen>
  );
}
