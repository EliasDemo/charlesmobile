import { useTranslation } from '@/shared/i18n';
import type { AdSlotKey } from '../api/adsApi';
import { useAdSlot } from '../hooks/useAds';
import { FeaturedCarousel } from './StoreParts';

/**
 * A sponsor's space, as a carousel that slides sideways (the next ad peeks out). Shows nothing
 * when the space has no ads (or they could not be read), and always carries the "Publicidad"
 * label. Tapping the brand opens its catalog; tapping the ad opens its page.
 */
export function AdSlot({
  slot,
  onOpenSponsor,
}: {
  slot: AdSlotKey;
  onOpenSponsor: (sponsorId: string) => void;
}) {
  const { t } = useTranslation('ads');
  const ads = useAdSlot(slot);
  if (ads.items.length === 0) return null;
  return (
    <FeaturedCarousel
      ads={ads.items}
      onOpen={ads.open}
      label={t('label')}
      onOpenSponsor={onOpenSponsor}
      testID={`ad-slot-${slot}`}
    />
  );
}
