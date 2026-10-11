import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  FadeIn,
  IconTile,
  Notice,
  Stars,
  Text,
  TextField,
} from '@/shared/ui';
import type { PendingReviewBooking, ReviewReportTarget } from '../api/reviewsApi';
import {
  REPORT_DETAILS_MAX,
  REVIEW_REPORT_REASONS,
  usePendingReviews,
  useReportReview,
} from '../hooks/useReviews';

/** "¿Cómo te fue con tu corte?": the most recent booking waiting for a review, in Reservas. */
export function PendingReviewPrompt({ onReview }: { onReview: (bookingId: string) => void }) {
  const { t } = useTranslation('reviews');
  const pending = usePendingReviews();
  const booking = pending.data?.[0];
  if (!booking) return null;
  return (
    <FadeIn>
      <Card style={styles.prompt} testID="pending-review">
        <View style={styles.row}>
          <IconTile icon="star" tone="pending" />
          <View style={styles.flex}>
            <Text variant="bodyStrong">
              {t('prompt.title', { service: (booking.service.name ?? '').toLowerCase() })}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t('prompt.message', { shop: booking.barbershop.name ?? '' })}
            </Text>
          </View>
        </View>
        <Button label={t('prompt.action')} icon="star" onPress={() => onReview(booking.id)} fullWidth />
      </Card>
    </FadeIn>
  );
}

/** In the booking detail: "Valorar esta cita", or my review with "Editar" while allowed. */
export function BookingReviewSection({
  booking,
  onReview,
  onEditReview,
}: {
  booking: PendingReviewBooking;
  onReview: (bookingId: string) => void;
  onEditReview: (reviewId: string) => void;
}) {
  const { t } = useTranslation('reviews');
  if (booking.canReview) {
    return <Button label={t('booking.review')} icon="star" onPress={() => onReview(booking.id)} fullWidth />;
  }
  if (!booking.review) return null;
  const review = booking.review;
  return (
    <Card>
      <Text variant="label" color="textSecondary">
        {t('booking.yours')}
      </Text>
      <Stars rating={review.rating} />
      {review.canEdit ? (
        <Button
          label={t('booking.edit')}
          variant="secondary"
          icon="create"
          onPress={() => onEditReview(review.id)}
        />
      ) : null}
    </Card>
  );
}

/** "Reportar" under a public review (or its response). */
export function ReportReviewButton({
  reviewId,
  target = 'REVIEW',
}: {
  reviewId: string;
  target?: ReviewReportTarget;
}) {
  const { t } = useTranslation('reviews');
  const r = useReportReview(reviewId, target);
  return (
    <>
      <Button label={t('report.action')} variant="ghost" icon="flag" onPress={r.ask} />
      <ConfirmDialog
        visible={r.open}
        title={t('report.title')}
        message={t('report.message')}
        confirmLabel={t('report.send')}
        onConfirm={r.send}
        onCancel={r.close}
        loading={r.isSending}
        confirmDisabled={!r.canSend}
        icon="flag"
      >
        <View style={styles.chips}>
          {REVIEW_REPORT_REASONS.map((reason) => (
            <Chip
              key={reason}
              label={t(`report.reasons.${reason}`)}
              selected={r.reason === reason}
              onPress={() => r.setReason(reason)}
            />
          ))}
        </View>
        <TextField
          label={t('report.details')}
          value={r.details}
          onChangeText={r.setDetails}
          maxLength={REPORT_DETAILS_MAX}
          multiline
        />
        {r.error ? <Notice tone="danger" message={r.error} /> : null}
      </ConfirmDialog>
    </>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
