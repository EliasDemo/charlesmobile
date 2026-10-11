import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate, formatTime } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, IconTile, InfoCard, InfiniteList, Notice, StatusPill, type IconName } from '@/shared/ui';
import type { AppNotification, NotificationResource } from '../api/notificationsApi';
import { useInbox } from '../hooks/useNotifications';

const RESOURCE_ICON: Record<NotificationResource['type'], IconName> = {
  booking: 'calendar',
  review: 'star',
  ticket: 'chatbubbles',
  barbershop: 'storefront',
  account: 'shield-checkmark',
};

/** Inbox of notices: every notice lands here, even when the push did not arrive. */
export function InboxScreen({ onOpen }: { onOpen: (resource: NotificationResource) => void }) {
  const { t } = useTranslation('notifications');
  const inbox = useInbox();
  const renderItem = ({ item }: { item: AppNotification }) => {
    const unread = item.readAt === null;
    return (
      <InfoCard
        testID={`notification-${item.id}`}
        onPress={() => onOpen(inbox.open(item))}
        leading={<IconTile icon={RESOURCE_ICON[item.resource.type]} />}
        title={item.title}
        subtitle={item.body}
        details={[
          {
            icon: 'time',
            text: t('when', {
              date: formatShortDate(item.createdAt, env.defaultTimeZone),
              time: formatTime(item.createdAt, env.defaultTimeZone),
            }),
          },
        ]}
        trailing={unread ? <StatusPill tone="pending" icon="ellipse" label={t('unread')} /> : undefined}
      />
    );
  };
  return (
    <InfiniteList
      query={inbox.list}
      keyExtractor={(n) => n.id}
      renderItem={renderItem}
      empty={{ title: t('empty'), message: t('emptyMessage'), icon: 'notifications-off-outline' }}
      header={
        inbox.hasUnread || inbox.error ? (
          <View style={styles.header}>
            {inbox.error ? <Notice tone="danger" message={inbox.error} /> : null}
            {inbox.hasUnread ? (
              <Button
                label={t('readAll')}
                variant="ghost"
                onPress={inbox.readAll}
                loading={inbox.isReadingAll}
              />
            ) : null}
          </View>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, alignItems: 'flex-end' },
});
