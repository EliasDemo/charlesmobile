import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Card, ListRow, Notice, QueryView, Screen, Text } from '@/shared/ui';
import type { ManagedShop } from '../api/shopApi';
import { useManagedShop } from '../hooks/useManagedShop';
import { useShopReview } from '../hooks/useShopReview';

/** Review before publishing (ALTA.md): state, what is missing, the support notes and sending it. */
export function ShopReviewScreen({ shopId, onEditDetails }: { shopId: string; onEditDetails: () => void }) {
  const shop = useManagedShop(shopId);
  return (
    <Screen>
      <QueryView query={shop}>{(data) => <ReviewView shop={data} onEditDetails={onEditDetails} />}</QueryView>
    </Screen>
  );
}

function ReviewView({ shop, onEditDetails }: { shop: ManagedShop; onEditDetails: () => void }) {
  const { t } = useTranslation('shop');
  const r = useShopReview(shop.id);
  const isOwner = shop.myRole === 'OWNER';
  return (
    <QueryView query={r.review}>
      {(review) => (
        <View style={styles.content}>
          {review.status === 'DRAFT' ? <Notice tone="info" message={t('review.draft')} /> : null}
          {review.status === 'PENDING_REVIEW' ? (
            <Notice
              tone="info"
              message={
                review.submittedAt
                  ? t('review.pendingSince', { date: formatLongDate(review.submittedAt, shop.timezone) })
                  : t('review.pending')
              }
            />
          ) : null}
          {review.status === 'CHANGES_REQUESTED' ? (
            <Notice
              tone="warning"
              title={t('review.changesTitle')}
              message={review.reviewNotes ?? t('review.noNotes')}
            />
          ) : null}
          {review.status === 'OPEN' ? <Notice tone="success" message={t('review.approved')} /> : null}
          {r.submitted ? <Notice tone="success" message={t('review.sent')} /> : null}

          {r.missing.length > 0 ? (
            <Card>
              <Text variant="subtitle">{t('review.missingTitle')}</Text>
              {r.missing.map((requirement) => (
                <ListRow
                  key={requirement}
                  title={t(`review.requirement.${requirement}`)}
                  onPress={isOwner ? onEditDetails : undefined}
                />
              ))}
            </Card>
          ) : null}

          {r.submitError ? <Notice tone="danger" message={r.submitError} /> : null}
          {review.status === 'DRAFT' || review.status === 'CHANGES_REQUESTED' ? (
            isOwner ? (
              <Button
                label={review.status === 'DRAFT' ? t('review.submit') : t('review.resubmit')}
                onPress={r.submit}
                loading={r.isSubmitting}
                disabled={!review.canSubmit}
                fullWidth
              />
            ) : (
              <Text variant="caption" color="textSecondary">
                {t('review.ownerOnly')}
              </Text>
            )
          ) : null}
          {review.status === 'CHANGES_REQUESTED' && isOwner ? (
            <Button label={t('review.fix')} variant="secondary" onPress={onEditDetails} />
          ) : null}
        </View>
      )}
    </QueryView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
});
