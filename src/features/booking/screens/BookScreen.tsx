import { ScrollView, StyleSheet, View } from 'react-native';
import { ResultCard } from '@/features/search';
import { useTranslation } from '@/shared/i18n';
import { formatMinutes, formatMoney, formatTime } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Chip, DateSelector, Notice, QueryView, Screen, Text } from '@/shared/ui';
import { useBookingSetup } from '../hooks/useBookingSetup';

export interface BookScreenProps {
  barbershopId: string;
  serviceId?: string;
  /** Barber already chosen ("Reservar este estilo" from a gallery photo). */
  barberId?: string;
  onContinue: () => void;
  onBack: () => void;
  onOpenBarbershop: (id: string) => void;
}

export function BookScreen({
  barbershopId,
  serviceId,
  barberId,
  onContinue,
  onBack,
  onOpenBarbershop,
}: BookScreenProps) {
  const { t } = useTranslation('booking');
  const setup = useBookingSetup(barbershopId, serviceId, barberId);
  const { draft } = setup;
  const nextDay = setup.days[setup.days.findIndex((d) => d.date === draft.date) + 1]?.date ?? null;
  const notFound = {
    title: t('notFound.title', { ns: 'barbershop' }),
    message: t('notFound.message', { ns: 'barbershop' }),
    action: { label: t('notFound.action', { ns: 'barbershop' }), onPress: onBack },
  };

  return (
    <Screen>
      <QueryView query={setup.shop} notFound={notFound}>
        {(shop) => (
          <View style={styles.content}>
            <Text variant="title">{shop.name}</Text>
            {draft.notice === 'slotTaken' ? <Notice tone="warning" message={t('book.slotTaken')} /> : null}

            <Section title={t('book.service')}>
              <QueryView query={setup.services} isEmpty={(list) => list.length === 0}>
                {(services) => (
                  <View style={styles.chips}>
                    {services.map((service) => (
                      <Chip
                        key={service.id}
                        label={`${service.name} · ${formatMoney(service.price)} · ${formatMinutes(service.durationMinutes)}`}
                        selected={draft.serviceId === service.id}
                        onPress={() => draft.setService(service.id)}
                      />
                    ))}
                  </View>
                )}
              </QueryView>
            </Section>

            {setup.service ? (
              <>
                <Section title={t('book.barber')}>
                  <View style={styles.chips}>
                    <Chip
                      label={t('book.anyBarber')}
                      selected={draft.barberId === null}
                      onPress={() => draft.setBarber(null)}
                    />
                    {setup.eligibleBarbers.map((barber) => (
                      <Chip
                        key={barber.id}
                        label={barber.displayName}
                        selected={draft.barberId === barber.id}
                        onPress={() => draft.setBarber(barber.id)}
                      />
                    ))}
                  </View>
                </Section>

                <Section title={t('book.day')}>
                  <DateSelector
                    days={setup.days}
                    selected={draft.date}
                    onSelect={(date) => date && draft.setDate(date)}
                    label={t('book.day')}
                  />
                </Section>

                <Section title={t('book.slots')}>
                  <Text variant="caption" color="textMuted">
                    {t('book.slotsTimezone', { timezone: shop.timezone })}
                  </Text>
                  <QueryView query={setup.availability}>
                    {() =>
                      setup.noSlots ? (
                        <View style={styles.content}>
                          <Notice tone="info" message={t('book.noSlots')}>
                            {nextDay ? (
                              <Button
                                label={t('nextDay', { ns: 'common' })}
                                variant="secondary"
                                icon="arrow-forward"
                                onPress={() => draft.setDate(nextDay)}
                              />
                            ) : null}
                          </Notice>
                          <Text variant="subtitle">{t('book.alternativesTitle')}</Text>
                          <QueryView
                            query={setup.alternatives}
                            isEmpty={(alternatives) => alternatives.items.length === 0}
                            empty={{ message: t('service.alternativesEmpty', { ns: 'barbershop' }) }}
                          >
                            {(alternatives) =>
                              alternatives.items.map((alternative) => (
                                <ResultCard
                                  key={alternative.barbershop.id}
                                  item={alternative.barbershop}
                                  onPress={onOpenBarbershop}
                                />
                              ))
                            }
                          </QueryView>
                        </View>
                      ) : (
                        setup.slotGroups.map((group) => (
                          <View key={group.part} style={styles.group}>
                            <Text variant="label" color="textSecondary">
                              {t(`book.parts.${group.part}`)}
                            </Text>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.chips}
                            >
                              {group.slots.map((slot) => (
                                <Chip
                                  key={slot.startAt}
                                  label={formatTime(slot.startAt, shop.timezone)}
                                  selected={draft.slot?.startAt === slot.startAt}
                                  onPress={() => draft.setSlot({ startAt: slot.startAt, endAt: slot.endAt })}
                                />
                              ))}
                            </ScrollView>
                          </View>
                        ))
                      )
                    }
                  </QueryView>
                </Section>
              </>
            ) : (
              <Text color="textSecondary">{t('book.chooseService')}</Text>
            )}

            <Button label={t('book.continue')} onPress={onContinue} disabled={!setup.canContinue} fullWidth />
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="subtitle">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  section: { gap: spacing.sm },
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
