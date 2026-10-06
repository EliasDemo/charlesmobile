import { StyleSheet, View } from 'react-native';
import { ResultCard } from '@/features/search';
import { useTranslation } from '@/shared/i18n';
import { formatMinutes, formatMoney, formatShortDate, formatTime } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Card, EmptyState, LoadingState, Notice, QueryView, Screen, Text } from '@/shared/ui';
import { useServiceAvailability } from '../hooks/useBarbershop';

export interface ServiceScreenProps {
  barbershopId: string;
  serviceId: string;
  onBack: () => void;
  onOpenBarbershop: (id: string) => void;
}

export function ServiceScreen({ barbershopId, serviceId, onBack, onOpenBarbershop }: ServiceScreenProps) {
  const { t } = useTranslation('barbershop');
  const data = useServiceAvailability(barbershopId, serviceId);
  const notFound = {
    title: t('notFound.title'),
    message: t('notFound.message'),
    action: { label: t('notFound.action'), onPress: onBack },
  };

  if (data.serviceMissing) {
    return (
      <Screen>
        <EmptyState title={notFound.title} message={notFound.message} action={notFound.action} />
      </Screen>
    );
  }

  return (
    <Screen>
      <QueryView query={data.shop} notFound={notFound}>
        {(shop) => (
          <QueryView query={data.services} notFound={notFound}>
            {() =>
              data.service ? (
                <View style={styles.content}>
                  <Text variant="title">{data.service.name}</Text>
                  <Text color="textSecondary">{shop.name}</Text>
                  {data.service.description ? <Text>{data.service.description}</Text> : null}
                  <View style={styles.row}>
                    <Text variant="bodyStrong">{formatMoney(data.service.price)}</Text>
                    <Text color="textSecondary">{formatMinutes(data.service.durationMinutes)}</Text>
                  </View>
                  <View>
                    <Button label={t('book')} disabled fullWidth />
                    <Text variant="caption" color="textSecondary" align="center">
                      {t('bookSoon')}
                    </Text>
                  </View>
                  <Card>
                    <Text variant="subtitle">{t('service.nextSlot')}</Text>
                    <QueryView query={data.nextSlot}>
                      {(next) =>
                        next.slot ? (
                          <Text variant="bodyStrong" testID="next-slot">
                            {t('service.nextSlotAt', {
                              date: formatShortDate(next.slot.startAt, shop.timezone),
                              time: formatTime(next.slot.startAt, shop.timezone),
                            })}
                          </Text>
                        ) : (
                          <Notice tone="info" message={t('service.noSlot')} />
                        )
                      }
                    </QueryView>
                  </Card>
                  {data.noSlot ? (
                    <View style={styles.content}>
                      <Text variant="subtitle">{t('service.alternativesTitle')}</Text>
                      <QueryView
                        query={data.alternatives}
                        isEmpty={(alternatives) => alternatives.items.length === 0}
                        empty={{ message: t('service.alternativesEmpty') }}
                      >
                        {(alternatives) =>
                          alternatives.items.map((alternative) => (
                            <View key={alternative.barbershop.id} style={styles.alternative}>
                              <ResultCard item={alternative.barbershop} onPress={onOpenBarbershop} />
                              <Text variant="caption" color="textSecondary">
                                {t('service.alternativeSlot', {
                                  service: alternative.service.name,
                                  price: formatMoney(alternative.service.price),
                                  // The DTO has no zone: alternatives are nearby shops, shown in this shop's zone.
                                  time: `${formatShortDate(alternative.firstSlot.startAt, shop.timezone)} ${formatTime(alternative.firstSlot.startAt, shop.timezone)}`,
                                })}
                              </Text>
                            </View>
                          ))
                        }
                      </QueryView>
                    </View>
                  ) : null}
                </View>
              ) : (
                <LoadingState />
              )
            }
          </QueryView>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  alternative: { gap: spacing.xs },
});
