import type { ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate, formatTime } from '@/shared/lib';
import { sizes, spacing, useTheme, type StatusTone } from '@/shared/theme';
import {
  Button,
  Chip,
  IconTile,
  InfiniteList,
  InfoCard,
  Notice,
  QueryView,
  Screen,
  StatusPill,
  EmojiTextField,
  Text,
  TextField,
  useFieldErrorText,
  type IconName,
} from '@/shared/ui';
import type { TicketCategory, TicketDetail, TicketSummary } from '../api/supportApi';
import {
  CATEGORIES,
  MESSAGE_MAX,
  SUBJECT_MAX,
  useNewTicket,
  useTicket,
  useTickets,
} from '../hooks/useSupport';

const STATUS_STYLE: Record<TicketSummary['status'], { tone: StatusTone; icon: IconName }> = {
  OPEN: { tone: 'pending', icon: 'chatbubble-ellipses' },
  IN_PROGRESS: { tone: 'pending', icon: 'time' },
  RESOLVED: { tone: 'success', icon: 'checkmark-circle' },
  CLOSED: { tone: 'neutral', icon: 'lock-closed' },
};

const CATEGORY_ICON: Record<TicketCategory, IconName> = {
  ACCOUNT: 'person-circle',
  BOOKING: 'calendar',
  PAYMENT: 'card',
  BARBERSHOP: 'storefront',
  REVIEW: 'star',
  APP: 'phone-portrait',
  OTHER: 'help-circle',
};

const when = (iso: string) =>
  `${formatShortDate(iso, env.defaultTimeZone)} · ${formatTime(iso, env.defaultTimeZone)}`;

/** My support tickets. `accessToken`: restricted access of a disabled account. */
export function SupportScreen({
  accessToken,
  header,
  onNew,
  onOpen,
}: {
  accessToken?: string | null;
  /** Shown above the list (the disabled-account notice). */
  header?: ReactNode;
  onNew: () => void;
  onOpen: (ticketId: string) => void;
}) {
  const { t } = useTranslation('support');
  const list = useTickets(accessToken);
  return (
    <InfiniteList
      query={list}
      keyExtractor={(ticket) => ticket.id}
      header={
        <View style={styles.listHeader}>
          {header}
          <Button label={t('list.new')} icon="add-circle" onPress={onNew} fullWidth />
        </View>
      }
      empty={{ title: t('list.empty'), message: t('list.emptyMessage'), icon: 'chatbubbles-outline' }}
      renderItem={({ item }) => (
        <InfoCard
          testID={`ticket-${item.id}`}
          onPress={() => onOpen(item.id)}
          leading={<IconTile icon={CATEGORY_ICON[item.category]} />}
          title={item.subject}
          subtitle={t(`category.${item.category}`)}
          details={[{ icon: 'time', text: when(item.updatedAt) }]}
          trailing={
            <StatusPill
              tone={STATUS_STYLE[item.status].tone}
              icon={STATUS_STYLE[item.status].icon}
              label={t(`status.${item.status}`)}
            />
          }
        />
      )}
    />
  );
}

/** New ticket: category, subject and the first message; optionally about a booking. */
export function NewTicketScreen({
  accessToken,
  bookingId,
  onCreated,
}: {
  accessToken?: string | null;
  bookingId?: string;
  onCreated: (ticketId: string) => void;
}) {
  const { t } = useTranslation('support');
  const errorText = useFieldErrorText('support');
  const f = useNewTicket({ token: accessToken, bookingId, onCreated });
  return (
    <Screen>
      {f.aboutBooking ? <Notice tone="info" message={t('new.aboutBooking')} /> : null}
      {f.generalError ? <Notice tone="danger" message={f.generalError} /> : null}
      <Controller
        control={f.form.control}
        name="category"
        render={({ field }) => (
          <View style={styles.section}>
            <Text variant="label" color="textSecondary">
              {t('new.category')}
            </Text>
            <View style={styles.chips}>
              {CATEGORIES.map((category) => (
                <Chip
                  key={category}
                  label={t(`category.${category}`)}
                  selected={field.value === category}
                  onPress={() => field.onChange(category)}
                />
              ))}
            </View>
          </View>
        )}
      />
      <Controller
        control={f.form.control}
        name="subject"
        render={({ field, fieldState }) => (
          <TextField
            label={t('new.subject')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            maxLength={SUBJECT_MAX}
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      <Controller
        control={f.form.control}
        name="message"
        render={({ field, fieldState }) => (
          <EmojiTextField
            label={t('new.message')}
            hint={t('new.messageHint')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            maxLength={MESSAGE_MAX}
            multiline
            error={errorText(fieldState.error?.message)}
          />
        )}
      />
      <Button
        label={t('new.send')}
        icon="send"
        onPress={() => void f.submit()}
        loading={f.isSubmitting}
        fullWidth
      />
    </Screen>
  );
}

/** One ticket as a conversation; reply while the API allows it. */
export function TicketScreen({
  ticketId,
  accessToken,
  onNew,
}: {
  ticketId: string;
  accessToken?: string | null;
  onNew: () => void;
}) {
  const { t } = useTranslation('support');
  const c = useTicket(ticketId, accessToken);
  return (
    <Screen>
      <QueryView query={c.ticket}>
        {(ticket) => (
          <View style={styles.content}>
            <TicketHeader ticket={ticket} />
            <View style={styles.messages}>
              {ticket.messages.map((message) => (
                <Bubble
                  key={message.id}
                  mine={message.from === 'USER'}
                  body={message.body}
                  at={message.createdAt}
                />
              ))}
            </View>
            {c.closed || (!ticket.canReply && ticket.status !== 'OPEN') ? (
              <Notice tone="info" message={t('ticket.closed')}>
                <Button label={t('list.new')} variant="secondary" icon="add-circle" onPress={onNew} />
              </Notice>
            ) : null}
            {c.error ? <Notice tone="danger" message={c.error} /> : null}
            {ticket.canReply && !c.closed ? (
              <View style={styles.reply}>
                <EmojiTextField
                  label={t('ticket.reply')}
                  value={c.message}
                  onChangeText={c.setMessage}
                  maxLength={MESSAGE_MAX}
                  multiline
                />
                <Button
                  label={t('ticket.send')}
                  icon="send"
                  onPress={c.send}
                  loading={c.isSending}
                  disabled={!c.canSend}
                  fullWidth
                />
              </View>
            ) : null}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

function TicketHeader({ ticket }: { ticket: TicketDetail }) {
  const { t } = useTranslation('support');
  return (
    <View style={styles.header}>
      <Text variant="title">{ticket.subject}</Text>
      <View style={styles.headerRow}>
        <StatusPill
          tone={STATUS_STYLE[ticket.status].tone}
          icon={STATUS_STYLE[ticket.status].icon}
          label={t(`status.${ticket.status}`)}
        />
        <Text variant="caption" color="textSecondary">
          {t(`category.${ticket.category}`)}
        </Text>
      </View>
    </View>
  );
}

function Bubble({ mine, body, at }: { mine: boolean; body: string; at: string }) {
  const { t } = useTranslation('support');
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bubble,
        mine ? styles.mine : styles.theirs,
        {
          backgroundColor: mine ? theme.colors.primarySoft : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
      accessible
      accessibilityLabel={`${mine ? t('ticket.you') : t('ticket.support')}: ${body}`}
    >
      <Text variant="label" color={mine ? 'primary' : 'textSecondary'}>
        {mine ? t('ticket.you') : t('ticket.support')}
      </Text>
      <Text selectable>{body}</Text>
      <Text variant="caption" color="textMuted">
        {when(at)}
      </Text>
    </View>
  );
}

/** Disabled account: what happened and the only thing that can be done (write to support). */
export function DisabledAccountHeader({ onLeave }: { onLeave: () => void }) {
  const { t } = useTranslation('support');
  return (
    <Notice tone="warning" title={t('disabled.title')} message={t('disabled.message')}>
      <Button label={t('disabled.leave')} variant="ghost" icon="log-out" onPress={onLeave} />
    </Notice>
  );
}

const styles = StyleSheet.create({
  listHeader: { gap: spacing.md },
  content: { gap: spacing.lg },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  header: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  messages: { gap: spacing.md },
  bubble: { maxWidth: '88%', padding: spacing.md, gap: spacing.xs, borderWidth: sizes.borderWidth },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  reply: { gap: spacing.sm },
});
