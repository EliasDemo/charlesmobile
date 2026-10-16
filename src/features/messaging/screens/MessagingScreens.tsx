import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate, formatTime } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  Button,
  Chip,
  ConfirmDialog,
  ErrorState,
  Icon,
  InfoCard,
  InfiniteList,
  LoadingState,
  Monogram,
  Notice,
  Screen,
  StatusPill,
  Text,
  TextField,
  translateErrorMessage,
} from '@/shared/ui';
import type { Conversation, Mailbox, Message, ReportReason } from '../api/messagingApi';
import { MESSAGE_MAX, useChat, useConversations, useStartConversation } from '../hooks/useMessaging';
import { useResolvedMailbox } from '../hooks/useResolvedMailbox';

const REASONS: ReportReason[] = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'SCAM', 'OTHER'];

/** When: today shows the time; other days, the date. In the default zone (messages have no shop). */
function when(iso: string) {
  const zone = env.defaultTimeZone;
  const today = formatShortDate(new Date().toISOString(), zone);
  const day = formatShortDate(iso, zone);
  return day === today ? formatTime(iso, zone) : day;
}

/** "Mensajes": conversations with barbershops (or, in barbershop mode, with people). */
export function ConversationsScreen({
  mailbox,
  onOpen,
}: {
  mailbox: Mailbox;
  onOpen: (conversation: Conversation) => void;
}) {
  const { t } = useTranslation('messages');
  const theme = useTheme();
  const list = useConversations(mailbox);
  return (
    <Screen scroll={false} edges={['top', 'left', 'right']}>
      <Text variant="title">{t('title')}</Text>
      <InfiniteList
        query={list}
        keyExtractor={(c) => c.id}
        empty={{
          title: t('empty'),
          message: mailbox.kind === 'me' ? t('emptyMessage') : t('emptyShop'),
          icon: 'chatbubbles-outline',
        }}
        renderItem={({ item }) => (
          <InfoCard
            testID={`conversation-${item.id}`}
            onPress={() => onOpen(item)}
            leading={
              <Monogram
                name={item.counterpart.name ?? ''}
                size={sizes.avatarSmall}
                imageUrl={item.counterpart.photoUrl}
              />
            }
            title={item.counterpart.name ?? t('unknown')}
            subtitle={item.lastMessagePreview ?? ''}
            details={[{ icon: 'time', text: when(item.lastMessageAt) }]}
            trailing={
              item.blocked ? (
                <View accessible accessibilityLabel={t('blocked')}>
                  <Icon name="lock-closed" color={theme.colors.textMuted} />
                </View>
              ) : item.unread > 0 ? (
                <StatusPill tone="pending" icon="ellipse" label={t('unread', { count: item.unread })} />
              ) : undefined
            }
          />
        )}
      />
    </Screen>
  );
}

/** A chat. `mailbox` absent: opened from a notice, the side is found from the conversation. */
export function ChatScreen({ mailbox, conversationId }: { mailbox?: Mailbox; conversationId: string }) {
  const { t } = useTranslation('messages');
  const resolved = useResolvedMailbox(conversationId, mailbox);
  if (resolved.status === 'loading') return <LoadingState />;
  if (resolved.status === 'notFound') {
    return (
      <Screen>
        <ErrorState message={t('chat.notFound')} />
      </Screen>
    );
  }
  return <Chat mailbox={resolved.mailbox} conversationId={conversationId} />;
}

function Chat({ mailbox, conversationId }: { mailbox: Mailbox; conversationId: string }) {
  const { t } = useTranslation('messages');
  const theme = useTheme();
  const chat = useChat(mailbox, conversationId);
  const [reporting, setReporting] = useState<Message | null>(null);
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [confirmBlock, setConfirmBlock] = useState(false);
  const conversation = chat.conversation;

  if (chat.query.isPending) return <LoadingState />;
  if (chat.query.isError && !chat.messages) {
    return (
      <Screen>
        <ErrorState
          message={translateErrorMessage(chat.query.error)}
          onRetry={() => void chat.query.refetch()}
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? touchTarget * 2 : 0}
    >
      {conversation ? (
        <View style={[styles.top, { borderBottomColor: theme.colors.border }]}>
          <Monogram
            name={conversation.counterpart.name ?? ''}
            size={sizes.avatarSmall}
            imageUrl={conversation.counterpart.photoUrl}
          />
          <Text variant="bodyStrong" style={styles.fill} numberOfLines={1}>
            {conversation.counterpart.name ?? t('unknown')}
          </Text>
          {!conversation.blocked || conversation.blockedByMe ? (
            <Button
              label={conversation.blocked ? t('chat.unblock') : t('chat.block')}
              variant="ghost"
              onPress={() => (conversation.blocked ? chat.toggleBlock() : setConfirmBlock(true))}
              loading={chat.isBlocking}
            />
          ) : null}
        </View>
      ) : null}
      <FlatList
        inverted
        data={chat.messages ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        onEndReached={() => {
          if (chat.query.hasNextPage && !chat.query.isFetchingNextPage) void chat.query.fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <Text color="textSecondary" align="center">
            {t('chat.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <Bubble
            message={item}
            onReport={!item.mine && item.side !== 'SYSTEM' ? () => setReporting(item) : undefined}
          />
        )}
      />
      {conversation?.blocked ? (
        <Notice
          tone="warning"
          message={conversation.blockedByMe ? t('chat.blockedByMe') : t('chat.blockedByThem')}
        />
      ) : null}
      {chat.error ? <Notice tone="danger" message={chat.error} /> : null}
      <View style={[styles.composer, { borderTopColor: theme.colors.border }]}>
        <View style={styles.fill}>
          <TextField
            label={t('chat.label')}
            value={chat.draft}
            onChangeText={chat.setDraft}
            multiline
            maxLength={MESSAGE_MAX}
            editable={!conversation?.blocked}
            testID="chat-input"
          />
        </View>
        <Button
          label={t('chat.send')}
          icon="send"
          onPress={chat.send}
          loading={chat.isSending}
          disabled={!chat.canSend}
        />
      </View>

      <ConfirmDialog
        visible={confirmBlock}
        title={t('chat.blockTitle')}
        message={t('chat.blockMessage')}
        confirmLabel={t('chat.block')}
        onConfirm={() => {
          setConfirmBlock(false);
          chat.toggleBlock();
        }}
        onCancel={() => setConfirmBlock(false)}
        destructive
      />
      <ConfirmDialog
        visible={reporting !== null}
        title={t('report.title')}
        message={t('report.message')}
        confirmLabel={t('report.send')}
        icon="flag"
        onConfirm={() => {
          if (reporting) chat.report(reporting.id, reason);
          setReporting(null);
        }}
        onCancel={() => setReporting(null)}
      >
        <View style={styles.reasons}>
          {REASONS.map((r) => (
            <Chip
              key={r}
              label={t(`report.reasons.${r}`)}
              selected={reason === r}
              onPress={() => setReason(r)}
            />
          ))}
        </View>
      </ConfirmDialog>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, onReport }: { message: Message; onReport?: () => void }) {
  const { t } = useTranslation('messages');
  const theme = useTheme();
  const time = formatTime(message.createdAt, env.defaultTimeZone);
  if (message.side === 'SYSTEM') {
    return (
      <View style={[styles.system, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
        <Text variant="caption" color="primary">
          {t('chat.charles')}
        </Text>
        <Text variant="caption" color="textSecondary" align="center">
          {message.body}
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      onLongPress={onReport}
      disabled={!onReport}
      accessibilityHint={onReport ? t('report.hint') : undefined}
      style={[
        styles.bubble,
        { borderRadius: theme.radius.lg },
        message.mine
          ? { alignSelf: 'flex-end', backgroundColor: theme.colors.primarySoft }
          : { alignSelf: 'flex-start', backgroundColor: theme.colors.surface },
      ]}
      testID={`message-${message.id}`}
    >
      {!message.mine && message.senderName ? (
        <Text variant="caption" color="textSecondary">
          {message.senderName}
        </Text>
      ) : null}
      <Text
        color={message.removed ? 'textMuted' : 'textPrimary'}
        style={message.removed ? styles.removed : undefined}
        selectable
      >
        {message.body}
      </Text>
      <Text variant="caption" color="textMuted" align="right">
        {time}
      </Text>
    </Pressable>
  );
}

/** First message: to a barbershop (person) or to a barber (barbershop). */
export function NewConversationScreen({
  target,
  name,
  onStarted,
}: {
  target: Parameters<typeof useStartConversation>[0]['target'];
  name?: string;
  onStarted: (conversationId: string) => void;
}) {
  const { t } = useTranslation('messages');
  const start = useStartConversation({ target, onStarted });
  return (
    <Screen>
      <Text variant="title">{name ? t('new.titleTo', { name }) : t('new.title')}</Text>
      <Text color="textSecondary">
        {target.kind === 'barbershop' ? t('new.hintShop') : t('new.hintBarber')}
      </Text>
      {start.error ? <Notice tone="danger" message={start.error} /> : null}
      <TextField
        label={t('chat.label')}
        value={start.body}
        onChangeText={start.setBody}
        multiline
        maxLength={MESSAGE_MAX}
        hint={t('new.limit', { max: MESSAGE_MAX })}
        testID="new-message-input"
      />
      <Button
        label={t('chat.send')}
        icon="send"
        onPress={start.send}
        loading={start.isSending}
        disabled={!start.canSend}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  messages: { padding: spacing.gutter, gap: spacing.sm },
  bubble: { maxWidth: '85%', padding: spacing.sm, gap: spacing.xxs },
  removed: { fontStyle: 'italic' },
  system: {
    alignSelf: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xxs,
    maxWidth: '90%',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

/** "Enviar mensaje" on a barbershop's profile. */
export function SendMessageButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('messages');
  return (
    <Button label={t('send')} variant="secondary" icon="chatbubble-ellipses" onPress={onPress} fullWidth />
  );
}
