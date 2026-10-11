import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Button, Chip, ConfirmDialog, Notice, TextField } from '@/shared/ui';
import { REPORT_DETAILS_MAX, REPORT_REASONS, useReportBarbershop } from '../hooks/useSupport';

/** "Reportar esta barbería": a quiet button that opens a sheet with the reason (once per account). */
export function ReportBarbershopButton({ barbershopId }: { barbershopId: string }) {
  const { t } = useTranslation('support');
  const r = useReportBarbershop(barbershopId);
  return (
    <>
      <Button label={t('report.action')} variant="ghost" icon="flag" onPress={r.ask} />
      <ConfirmDialog
        visible={r.open}
        title={t('report.title')}
        message={t('report.message')}
        confirmLabel={t('report.send')}
        onConfirm={r.send}
        onCancel={r.close}
        loading={r.isSending}
        confirmDisabled={!r.canSend}
        icon="flag"
      >
        <View style={styles.chips}>
          {REPORT_REASONS.map((reason) => (
            <Chip
              key={reason}
              label={t(`report.reasons.${reason}`)}
              selected={r.reason === reason}
              onPress={() => r.setReason(reason)}
            />
          ))}
        </View>
        <TextField
          label={t('report.details')}
          value={r.details}
          onChangeText={r.setDetails}
          maxLength={REPORT_DETAILS_MAX}
          multiline
        />
        {r.error ? <Notice tone="danger" message={r.error} /> : null}
      </ConfirmDialog>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
