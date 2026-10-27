import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { api, unwrap, useSession } from '@/shared/api';
import { useTranslation } from '@/shared/i18n';
import { haptic } from '@/shared/lib';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import { askForAccount } from './AuthPrompt';
import { Icon } from './Icon';
import { Text } from './Text';
import { showToast } from './Toast';

/**
 * "Me gusta" on a review: changes at once and is confirmed by the backend (idempotent PUT/DELETE);
 * if that fails, it goes back. Without a session, the account sheet.
 */
export function ReviewLikeButton({
  reviewId,
  likes,
  likedByMe,
}: {
  reviewId: string;
  likes: number;
  likedByMe: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pathname = usePathname();
  const authenticated = useSession((s) => s.status === 'authenticated');
  const [state, setState] = useState({ liked: likedByMe, count: likes });
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!authenticated) return askForAccount('generic', pathname);
    if (busy) return;
    const previous = state;
    const liked = !state.liked;
    setState({ liked, count: Math.max(0, state.count + (liked ? 1 : -1)) });
    if (liked) haptic('light');
    setBusy(true);
    try {
      const params = { params: { path: { id: reviewId } } };
      await unwrap(
        liked
          ? api.PUT('/api/v1/reviews/{id}/like', params)
          : api.DELETE('/api/v1/reviews/{id}/like', params),
      );
    } catch {
      setState(previous);
      showToast(t('like.failed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: state.liked }}
      accessibilityLabel={t('like.label', { count: state.count })}
      onPress={() => void toggle()}
      style={styles.button}
      testID={`like-${reviewId}`}
    >
      <Icon
        name={state.liked ? 'heart' : 'heart-outline'}
        size={sizes.icon}
        color={state.liked ? theme.colors.danger : theme.colors.textMuted}
      />
      <Text variant="label" color={state.liked ? 'danger' : 'textSecondary'}>
        {state.count > 0 ? String(state.count) : t('like.action')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touchTarget,
    alignSelf: 'flex-start',
    paddingRight: spacing.sm,
  },
});
