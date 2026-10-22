import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate, formatTime } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { Icon, Text } from '@/shared/ui';
import type { Message } from '../api/messagingApi';

const zone = env.defaultTimeZone;
const BUBBLE_TAIL = spacing.xs;

/** A day label between messages: "Hoy", "Ayer" or the date. */
export function dayLabel(iso: string, t: (key: 'chat.today' | 'chat.yesterday') => string): string {
  const day = formatShortDate(iso, zone);
  const now = Date.now();
  if (day === formatShortDate(new Date(now).toISOString(), zone)) return t('chat.today');
  if (day === formatShortDate(new Date(now - 86_400_000).toISOString(), zone)) return t('chat.yesterday');
  return day;
}

export function DaySeparator({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.day}>
      <View
        style={[styles.dayPill, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill }]}
      >
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      </View>
    </View>
  );
}

/**
 * A chat bubble. Mine on the right in the brand color, theirs on the left; consecutive messages
 * of the same side are grouped (only the last one has the "tail" corner and the time). Charles's
 * automatic messages are centered cards.
 */
export function ChatBubble({
  message,
  grouped,
  last,
  onReport,
}: {
  message: Message;
  /** The previous message (above) is from the same side: tighter spacing. */
  grouped: boolean;
  /** The last of its group: shows the time and the tail. */
  last: boolean;
  onReport?: () => void;
}) {
  const { t } = useTranslation('messages');
  const theme = useTheme();
  if (message.side === 'SYSTEM') {
    return (
      <View style={[styles.system, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }]}>
        <View style={styles.systemHead}>
          <Icon name="sparkles" size={sizes.icon * 0.8} color={theme.colors.primary} />
          <Text variant="caption" color="primary">
            {t('chat.charles')}
          </Text>
        </View>
        <Text variant="caption" color="textSecondary" align="center">
          {message.body}
        </Text>
      </View>
    );
  }
  const mine = message.mine;
  const r = theme.radius.lg;
  return (
    <Pressable
      onLongPress={onReport}
      disabled={!onReport}
      accessibilityHint={onReport ? t('report.hint') : undefined}
      style={[
        styles.bubble,
        {
          marginTop: grouped ? spacing.xxs : spacing.sm,
          alignSelf: mine ? 'flex-end' : 'flex-start',
          backgroundColor: mine ? theme.colors.primary : theme.colors.surface,
          borderTopLeftRadius: r,
          borderTopRightRadius: r,
          borderBottomLeftRadius: !mine && last ? BUBBLE_TAIL : r,
          borderBottomRightRadius: mine && last ? BUBBLE_TAIL : r,
        },
      ]}
      testID={`message-${message.id}`}
    >
      {!mine && !grouped && message.senderName ? (
        <Text variant="caption" color="primary">
          {message.side === 'USER' ? `@${message.senderName}` : message.senderName}
        </Text>
      ) : null}
      <Text
        color={message.removed ? 'textMuted' : mine ? 'onPrimary' : 'textPrimary'}
        style={message.removed ? styles.removed : undefined}
        selectable
      >
        {message.body}
      </Text>
      {last ? (
        <View style={styles.meta}>
          <Text variant="caption" color={mine ? 'onPrimary' : 'textMuted'} style={styles.time}>
            {formatTime(message.createdAt, zone)}
          </Text>
          {mine ? (
            <Icon name="checkmark-done" size={sizes.icon * 0.7} color={theme.colors.onPrimary} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

/** The writing bar: grows with the text, round send button, fixed at the bottom. */
export function Composer({
  value,
  onChange,
  onSend,
  canSend,
  sending,
  disabled,
  maxLength,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  canSend: boolean;
  sending: boolean;
  disabled: boolean;
  maxLength: number;
}) {
  const { t } = useTranslation('messages');
  const theme = useTheme();
  return (
    <View
      style={[
        styles.composer,
        { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={disabled ? t('chat.blockedShort') : t('chat.label')}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        maxLength={maxLength}
        editable={!disabled}
        accessibilityLabel={t('chat.label')}
        maxFontSizeMultiplier={2}
        style={[
          theme.typography.body,
          styles.input,
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.xl,
          },
        ]}
        testID="chat-input"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('chat.send')}
        accessibilityState={{ disabled: !canSend || sending }}
        disabled={!canSend || sending}
        onPress={onSend}
        style={[
          styles.send,
          {
            backgroundColor: canSend ? theme.colors.primary : theme.colors.border,
            borderRadius: touchTarget / 2,
          },
        ]}
      >
        {sending ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Icon name="send" size={sizes.icon} color={theme.colors.onPrimary} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { alignItems: 'center', marginVertical: spacing.sm },
  dayPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xxs },
  system: {
    alignSelf: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xxs,
    maxWidth: '90%',
    marginVertical: spacing.sm,
  },
  systemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  bubble: { maxWidth: '80%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xxs },
  removed: { fontStyle: 'italic' },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: spacing.xxs },
  time: { opacity: 0.8 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: touchTarget,
    maxHeight: touchTarget * 3,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  send: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
