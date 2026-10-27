import { StyleSheet, View } from 'react-native';
import { ResultCard } from '@/features/search';
import { WaitlistButton } from '@/features/waitlist';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate, formatTime } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Chip, DateSelector, Notice, QueryView, Screen, Text } from '@/shared/ui';
import { BarberChoice } from '../components/BarberChoice';
import { BOOK_BAR_SPACE, BookBar, ServiceOption, SlotButton, SlotGrid, Step } from '../components/BookParts';
import { useBookingSetup } from '../hooks/useBookingSetup';

export interface BookScreenProps {
  barbershopId: string;
  serviceId?: string;
  /** Barber already chosen ("Reservar este estilo" from a gallery photo). */
  barberId?: string;
  onContinue: () => void;
  onBack: () => void;
  onOpenBarbershop: (id: string) => void;
  /** The barber's professional profile (reviews, work), to check before choosing. */
  onOpenBarberProfile?: (profileId: string) => void;
  /** Joining the waitlist without a session: ask for an account and come back. */
  onRequireLogin?: () => void;
}

/** "Reservar" in four numbered steps (service, barber, day, time), with the choice fixed below. */
export function BookScreen({
  barbershopId,
  serviceId,
  barberId,
  onContinue,
  onBack,
  onOpenBarbershop,
  onOpenBarberProfile,
  onRequireLogin,
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
  const zone = setup.shop.data?.timezone;
  const summary =
    setup.service && zone
      ? [
          setup.service.name,
          draft.slot
            ? `${formatShortDate(draft.slot.startAt, zone)} · ${formatTime(draft.slot.startAt, zone)}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <View style={styles.fill}>
      <Screen>
        <QueryView query={setup.shop} notFound={notFound}>
          {(shop) => (
            <View style={styles.content}>
              <Text variant="display" numberOfLines={2}>
                {shop.name}
              </Text>
              {draft.notice === 'slotTaken' ? <Notice tone="warning" message={t('book.slotTaken')} /> : null}

              <Step number={1} title={t('book.service')} done={Boolean(setup.service)}>
                <QueryView query={setup.services} isEmpty={(list) => list.length === 0}>
                  {(services) => (
                    <View style={styles.list}>
                      {services.map((service) => (
                        <ServiceOption
                          key={service.id}
                          service={service}
                          selected={draft.serviceId === service.id}
                          onPress={() => draft.setService(service.id)}
                        />
                      ))}
                    </View>
                  )}
                </QueryView>
              </Step>

              {setup.service ? (
                <>
                  <Step number={2} title={t('book.barber')} done>
                    <View style={styles.chips}>
                      <Chip
                        label={t('book.anyBarber')}
                        selected={draft.barberId === null}
                        onPress={() => draft.setBarber(null)}
                      />
                    </View>
                    {setup.eligibleBarbers.map((barber) => {
                      const profileId = barber.profileId;
                      return (
                        <BarberChoice
                          key={barber.id}
                          barber={barber}
                          selected={draft.barberId === barber.id}
                          topRated={setup.topRatedBarberId === barber.id}
                          onSelect={() => draft.setBarber(barber.id)}
                          onOpenProfile={
                            profileId && onOpenBarberProfile
                              ? () => onOpenBarberProfile(profileId)
                              : undefined
                          }
                        />
                      );
                    })}
                  </Step>

                  <Step number={3} title={t('book.day')} done={Boolean(draft.date)}>
                    <DateSelector
                      days={setup.days}
                      selected={draft.date}
                      onSelect={(date) => date && draft.setDate(date)}
                      label={t('book.day')}
                    />
                  </Step>

                  <Step number={4} title={t('book.slots')} done={Boolean(draft.slot)}>
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
                            {draft.serviceId && draft.date && onRequireLogin ? (
                              <WaitlistButton
                                barbershopId={barbershopId}
                                serviceId={draft.serviceId}
                                date={draft.date}
                                barber={(() => {
                                  const chosen = setup.eligibleBarbers.find((b) => b.id === draft.barberId);
                                  return chosen ? { id: chosen.id, name: chosen.displayName } : null;
                                })()}
                                onRequireLogin={onRequireLogin}
                              />
                            ) : null}
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
                              <SlotGrid>
                                {group.slots.map((slot) => (
                                  <SlotButton
                                    key={slot.startAt}
                                    label={formatTime(slot.startAt, shop.timezone)}
                                    selected={draft.slot?.startAt === slot.startAt}
                                    onPress={() =>
                                      draft.setSlot({ startAt: slot.startAt, endAt: slot.endAt })
                                    }
                                  />
                                ))}
                              </SlotGrid>
                            </View>
                          ))
                        )
                      }
                    </QueryView>
                  </Step>
                </>
              ) : (
                <Text color="textSecondary">{t('book.chooseService')}</Text>
              )}
              <View style={styles.barSpace} />
            </View>
          )}
        </QueryView>
      </Screen>
      {setup.shop.data ? (
        <BookBar summary={summary} canContinue={setup.canContinue} onContinue={onContinue} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: spacing.xl },
  list: { gap: spacing.sm },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  barSpace: { height: BOOK_BAR_SPACE },
});
