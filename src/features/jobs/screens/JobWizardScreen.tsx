import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useStyles } from '@/features/gallery';
import { useTranslation } from '@/shared/i18n';
import { parseSoles } from '@/shared/lib';
import { spacing, useTheme } from '@/shared/theme';
import { Button, Chip, Notice, Screen, SwitchRow, Text, TextField } from '@/shared/ui';
import type { EmploymentType } from '../api/jobsApi';
import { JobCard } from '../components/JobParts';
import { EMPLOYMENT_TYPES, useJobForm } from '../hooks/useJobs';
import {
  REQUIREMENTS_MAX,
  offerFields,
  type OfferExtras,
  type PayPeriod,
  type SelectionProcess,
} from '../schemas/offer';

const STEPS = 3;
const PERIODS: PayPeriod[] = ['MONTH', 'WEEK', 'DAY', 'SERVICE'];
const PROCESSES: SelectionProcess[] = ['INTERVIEW', 'TRIAL', 'DIRECT'];

/**
 * "Publicar oferta" in 3 short steps (Puesto → Condiciones → Requisitos) and a preview of how
 * barbers will see it. Pay, "conversable", requirements and the selection process travel in the
 * text fields the contract has today (`compensationText`, `description`).
 */
export function JobWizardScreen({ shopId, onSaved }: { shopId: string; onSaved: (jobId: string) => void }) {
  const { t } = useTranslation('jobs');
  const theme = useTheme();
  const styleList = useStyles();
  const f = useJobForm({ shopId, onSaved: (job) => onSaved(job.id) });
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EmploymentType>('FULL_TIME');
  const [styleIds, setStyleIds] = useState<string[]>([]);
  const [extras, setExtras] = useState<OfferExtras>({
    amount: '',
    period: 'MONTH',
    commission: '',
    negotiable: false,
    requirements: [''],
    process: 'INTERVIEW',
    about: '',
  });
  const set = (patch: Partial<OfferExtras>) => setExtras((e) => ({ ...e, ...patch }));
  const offer = offerFields(extras, t);
  const canNext = [
    title.trim().length >= 5,
    extras.amount.trim() === '' || parseSoles(extras.amount) !== null,
    offer.description.length >= 20,
  ][step];

  const publish = () => {
    f.form.setValue('title', title.trim());
    f.form.setValue('employmentType', type);
    f.form.setValue('styleIds', styleIds);
    f.form.setValue('compensationText', offer.compensationText);
    f.form.setValue('description', offer.description);
    const { description: _d, compensationText: _c, ...structured } = offer;
    f.setStructured(structured);
    void f.submit();
  };

  return (
    <Screen>
      <View
        style={styles.progress}
        accessible
        accessibilityLabel={t('wizard.step', { step: Math.min(step + 1, STEPS), total: STEPS })}
      >
        {Array.from({ length: STEPS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                borderRadius: theme.radius.pill,
                backgroundColor: i <= step ? theme.colors.primary : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>
      {f.generalError ? <Notice tone="danger" message={f.generalError} /> : null}

      {step === 0 ? (
        <View style={styles.section}>
          <Text variant="title">{t('wizard.position')}</Text>
          <TextField
            label={t('form.title')}
            placeholder={t('wizard.titlePlaceholder')}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
          <Text variant="label" color="textSecondary">
            {t('form.type')}
          </Text>
          <View style={styles.chips}>
            {EMPLOYMENT_TYPES.map((k) => (
              <Chip key={k} label={t(`types.${k}`)} selected={type === k} onPress={() => setType(k)} />
            ))}
          </View>
          <Text variant="label" color="textSecondary">
            {t('form.styles')}
          </Text>
          <View style={styles.chips}>
            {(styleList.data ?? []).map((s) => {
              const on = styleIds.includes(s.id);
              return (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={on}
                  onPress={() =>
                    setStyleIds(
                      on
                        ? styleIds.filter((id) => id !== s.id)
                        : styleIds.length < 10
                          ? [...styleIds, s.id]
                          : styleIds,
                    )
                  }
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.section}>
          <Text variant="title">{t('wizard.conditions')}</Text>
          <TextField
            label={t('wizard.amount')}
            value={extras.amount}
            onChangeText={(amount) => set({ amount })}
            keyboardType="decimal-pad"
            maxLength={8}
          />
          <View style={styles.chips}>
            {PERIODS.map((p) => (
              <Chip
                key={p}
                label={t(`wizard.periods.${p}`)}
                selected={extras.period === p}
                onPress={() => set({ period: p })}
              />
            ))}
          </View>
          <TextField
            label={t('wizard.commission')}
            hint={t('wizard.commissionHint')}
            value={extras.commission}
            onChangeText={(commission) => set({ commission: commission.replace(/[^\d]/g, '') })}
            keyboardType="number-pad"
            maxLength={3}
          />
          <SwitchRow
            title={t('wizard.negotiable')}
            subtitle={t('wizard.negotiableHint')}
            value={extras.negotiable}
            onValueChange={(negotiable) => set({ negotiable })}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.section}>
          <Text variant="title">{t('wizard.requirements')}</Text>
          {extras.requirements.map((r, i) => (
            <TextField
              key={i}
              label={t('wizard.requirement', { n: i + 1 })}
              placeholder={t('wizard.requirementPlaceholder')}
              value={r}
              onChangeText={(text) =>
                set({ requirements: extras.requirements.map((x, j) => (j === i ? text : x)) })
              }
              maxLength={120}
            />
          ))}
          {extras.requirements.length < REQUIREMENTS_MAX ? (
            <Button
              label={t('wizard.addRequirement')}
              variant="ghost"
              icon="add"
              onPress={() => set({ requirements: [...extras.requirements, ''] })}
            />
          ) : null}
          <Text variant="label" color="textSecondary">
            {t('wizard.process')}
          </Text>
          <View style={styles.chips}>
            {PROCESSES.map((p) => (
              <Chip
                key={p}
                label={t(`wizard.processes.${p}`)}
                selected={extras.process === p}
                onPress={() => set({ process: p })}
              />
            ))}
          </View>
          <TextField
            label={t('wizard.about')}
            placeholder={t('wizard.aboutPlaceholder')}
            value={extras.about}
            onChangeText={(about) => set({ about })}
            multiline
            maxLength={1200}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.section}>
          <Text variant="title">{t('wizard.preview')}</Text>
          <Text color="textSecondary">{t('wizard.previewHint')}</Text>
          <JobCard
            job={{
              id: 'preview',
              distanceKm: null,
              location: null,
              negotiable: offer.negotiable,
              payMin: offer.payMin ?? null,
              payMax: offer.payMax ?? null,
              payType: offer.payType ?? null,
              payPeriod: offer.payPeriod ?? null,
              requirements: offer.requirements,
              schedule: null,
              selectionProcess: offer.selectionProcess,
              barbershop: {
                id: shopId,
                name: t('wizard.yourShop'),
                address: '',
                logoUrl: null,
                ratingAverage: null,
              },
              title: title.trim(),
              description: offer.description,
              employmentType: type,
              compensationText: offer.compensationText || null,
              styles: (styleList.data ?? [])
                .filter((s) => styleIds.includes(s.id))
                .map((s) => ({ id: s.id, key: s.key, name: s.name })),
              status: 'OPEN',
              closesAt: null,
              applicationsCount: 0,
              myApplicationStatus: null,
              createdAt: new Date().toISOString(),
            }}
            onPress={() => undefined}
          />
          <Text>{offer.description}</Text>
        </View>
      ) : null}

      <View style={styles.nav}>
        {step > 0 ? (
          <Button label={t('wizard.back')} variant="ghost" onPress={() => setStep(step - 1)} />
        ) : null}
        <View style={styles.flex}>
          {step < 3 ? (
            <Button
              label={t('wizard.next')}
              onPress={() => setStep(step + 1)}
              disabled={!canNext}
              fullWidth
            />
          ) : (
            <Button
              label={t('form.publish')}
              icon="megaphone"
              onPress={publish}
              loading={f.isSubmitting}
              fullWidth
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: spacing.xs },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
