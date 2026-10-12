import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate } from '@/shared/lib';
import { spacing, useTheme, type StatusTone } from '@/shared/theme';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  InfiniteList,
  LoadingState,
  Notice,
  Screen,
  StarPicker,
  Stars,
  StatusPill,
  EmojiTextField,
  Text,
  useFieldErrorText,
  type IconName,
} from '@/shared/ui';
import { translateError } from '@/shared/api';
import type { ManagedReview, MyReview, ReviewStatus } from '../api/reviewsApi';
import {
  COMMENT_MAX,
  RESPONSE_MAX,
  useMyReview,
  useMyReviews,
  useReviewForm,
  useShopReviews,
} from '../hooks/useReviews';

/** Quick reactions for the comment: they only add the emoji to the text. */
const REACTIONS = ['😍', '🔥', '👍', '😐', '👎'] as const;

const STATUS_STYLE: Record<ReviewStatus, { tone: StatusTone; icon: IconName }> = {
  VISIBLE: { tone: 'success', icon: 'eye' },
  UNDER_REVIEW: { tone: 'pending', icon: 'hourglass' },
  HIDDEN: { tone: 'neutral', icon: 'eye-off' },
};

/** Review a booking: stars and an optional comment. */
export function NewReviewScreen({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  return (
    <Screen>
      <ReviewForm bookingId={bookingId} onDone={onDone} />
    </Screen>
  );
}

/** Edit (once) or withdraw one of my reviews. */
export function EditReviewScreen({ reviewId, onDone }: { reviewId: string; onDone: () => void }) {
  const { t } = useTranslation('reviews');
  const r = useMyReview(reviewId);
  return (
    <Screen>
      {r.review ? (
        <ReviewForm existing={r.review} onDone={onDone} />
      ) : r.error ? (
        <ErrorState message={translateError(r.error).message} onRetry={() => void r.retry()} />
      ) : r.loading ? (
        <LoadingState />
      ) : (
        <EmptyState icon="star-outline" title={t('form.notFound')} />
      )}
    </Screen>
  );
}

function ReviewForm({
  bookingId,
  existing,
  onDone,
}: {
  bookingId?: string;
  existing?: MyReview;
  onDone: () => void;
}) {
  const { t } = useTranslation('reviews');
  const errorText = useFieldErrorText('reviews');
  const f = useReviewForm({ bookingId, existing, onDone });
  return (
    <View style={styles.content}>
      <Text variant="title" align="center">
        {t('form.question')}
      </Text>
      <View style={styles.center}>
        <StarPicker value={f.rating} onChange={f.setRating} />
      </View>
      <EmojiTextField
        label={t('form.comment')}
        reactions={REACTIONS}
        hint={t('form.commentHint')}
        value={f.comment}
        onChangeText={f.setComment}
        maxLength={COMMENT_MAX}
        multiline
        error={errorText(f.commentError ?? undefined)}
      />
      {f.editing ? <Notice tone="info" message={t('form.editOnce')} /> : null}
      {f.error ? <Notice tone="danger" message={f.error} /> : null}
      <Button
        label={f.editing ? t('form.save') : t('form.send')}
        icon="star"
        onPress={f.save}
        loading={f.isSaving}
        disabled={!f.canSave}
        fullWidth
      />
      {f.editing ? (
        <Button label={t('form.delete')} variant="ghost" icon="trash" onPress={f.askDelete} />
      ) : null}
      <ConfirmDialog
        visible={f.confirmingDelete}
        title={t('form.deleteTitle')}
        message={t('form.deleteMessage')}
        confirmLabel={t('form.deleteConfirm')}
        onConfirm={f.confirmDelete}
        onCancel={f.cancelDelete}
        loading={f.isDeleting}
        destructive
      />
    </View>
  );
}

/** "Mis valoraciones": what I wrote, its state and the barbershop's response. */
export function MyReviewsScreen({ onEdit }: { onEdit: (reviewId: string) => void }) {
  const { t } = useTranslation('reviews');
  const list = useMyReviews();
  return (
    <InfiniteList
      query={list}
      keyExtractor={(r) => r.id}
      empty={{ title: t('mine.empty'), message: t('mine.emptyMessage'), icon: 'star-outline' }}
      renderItem={({ item }) => (
        <ReviewCard
          title={item.barbershop.name}
          review={item}
          status={item.status}
          footer={
            item.canEdit ? (
              <Button
                label={t('mine.edit')}
                variant="secondary"
                icon="create"
                onPress={() => onEdit(item.id)}
              />
            ) : null
          }
        />
      )}
    />
  );
}

/** Mi barbería → Valoraciones: every review with its state; respond while `canRespond`. */
export function ShopReviewsScreen({ shopId }: { shopId: string }) {
  const { t } = useTranslation('reviews');
  const r = useShopReviews(shopId);
  return (
    <>
      <InfiniteList
        query={r.list}
        keyExtractor={(review) => review.id}
        empty={{ title: t('shop.empty'), message: t('shop.emptyMessage'), icon: 'star-outline' }}
        renderItem={({ item }) => (
          <ReviewCard
            title={item.authorName}
            review={item}
            status={item.status}
            hiddenResponse={item.responseStatus === 'HIDDEN'}
            footer={
              item.canRespond ? (
                <Button
                  label={item.response ? t('shop.editResponse') : t('shop.respond')}
                  variant="secondary"
                  icon="chatbubble"
                  onPress={() => r.askRespond(item)}
                />
              ) : null
            }
          />
        )}
      />
      <ConfirmDialog
        visible={r.responding !== null}
        title={t('shop.responseTitle', { name: r.responding?.authorName ?? '' })}
        message={t('shop.responseMessage')}
        confirmLabel={t('shop.send')}
        onConfirm={r.send}
        onCancel={r.cancelRespond}
        loading={r.isSending}
        confirmDisabled={!r.canSend}
        icon="chatbubbles"
      >
        <EmojiTextField
          label={t('shop.responseField')}
          value={r.text}
          onChangeText={r.setText}
          maxLength={RESPONSE_MAX}
          multiline
        />
        {r.error ? <Notice tone="danger" message={r.error} /> : null}
      </ConfirmDialog>
    </>
  );
}

function ReviewCard({
  title,
  review,
  status,
  hiddenResponse = false,
  footer,
}: {
  title: string;
  review: MyReview | ManagedReview;
  status: ReviewStatus;
  hiddenResponse?: boolean;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation('reviews');
  const theme = useTheme();
  return (
    <Card testID={`review-${review.id}`}>
      <View style={styles.row}>
        <Text variant="bodyStrong" style={styles.flex}>
          {title}
        </Text>
        <StatusPill
          tone={STATUS_STYLE[status].tone}
          icon={STATUS_STYLE[status].icon}
          label={t(`status.${status}`)}
        />
      </View>
      <Stars rating={review.rating} />
      <Text variant="caption" color="textSecondary">
        {t('by', { service: review.serviceName, barber: review.barber.displayName })} ·{' '}
        {formatShortDate(review.createdAt, env.defaultTimeZone)}
        {review.editedAt ? ` · ${t('edited')}` : ''}
      </Text>
      {review.comment ? <Text>{review.comment}</Text> : null}
      {review.response ? (
        <View
          style={[
            styles.response,
            { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
          ]}
        >
          <Text variant="label" color="primary">
            {t('mine.response')}
          </Text>
          <Text>{review.response.text}</Text>
          {hiddenResponse ? (
            <Text variant="caption" color="textMuted">
              {t('shop.responseHidden')}
            </Text>
          ) : null}
        </View>
      ) : null}
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  response: { padding: spacing.md, gap: spacing.xs },
});
