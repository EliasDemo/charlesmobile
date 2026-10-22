import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { ActionTile, Button, Card, Icon, ListRow, Skeleton, Text } from '@/shared/ui';
import { useJobList } from '../hooks/useJobs';
import { JobCard } from './JobParts';

/** Offers shown on the card; the rest are in "Ver todas las ofertas". */
const PREVIEW = 3;

export interface JobBoardCardProps {
  /**
   * `primary`: a barber without a barbershop (looking for work) — offers first.
   * `subtle`: a barber who already works somewhere — a quiet entry, low on the screen.
   */
  variant: 'primary' | 'subtle';
  /** The barber's district (from their professional profile), to show nearby offers first. */
  area?: string;
  hasProfile: boolean;
  onOpenJobs: () => void;
  onOpenJob: (id: string) => void;
  onApplications: () => void;
  onProfile: () => void;
}

/** "Bolsa laboral" in barbershop mode, so a barber can look for work and apply from there. */
export function JobBoardCard(props: JobBoardCardProps) {
  const { t } = useTranslation('jobs');
  if (props.variant === 'subtle') {
    return (
      <ActionTile
        icon="briefcase"
        label={t('board.title')}
        hint={t('board.subtleHint')}
        onPress={props.onOpenJobs}
      />
    );
  }
  return <PrimaryBoard {...props} />;
}

function PrimaryBoard({
  area,
  hasProfile,
  onOpenJobs,
  onOpenJob,
  onApplications,
  onProfile,
}: JobBoardCardProps) {
  const { t } = useTranslation('jobs');
  const theme = useTheme();
  const nearby = useJobList({ area });
  const items = (nearby.items ?? []).slice(0, PREVIEW);
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Icon name="briefcase" size={sizes.icon} color={theme.colors.primary} />
        <Text variant="subtitle" style={styles.flex}>
          {t('board.title')}
        </Text>
      </View>
      <Text color="textSecondary">{area ? t('board.nearby', { area }) : t('board.intro')}</Text>
      {nearby.items === undefined && !nearby.error ? <Skeleton /> : null}
      {nearby.items !== undefined && items.length === 0 ? (
        <Text variant="caption" color="textSecondary">
          {area ? t('board.emptyArea') : t('empty')}
        </Text>
      ) : null}
      {items.map((job) => (
        <JobCard key={job.id} job={job} onPress={() => onOpenJob(job.id)} />
      ))}
      <Button label={t('board.all')} icon="search" onPress={onOpenJobs} fullWidth />
      <View>
        <ListRow icon="document-text" title={t('myApplications')} onPress={onApplications} />
        <ListRow
          icon="person-circle"
          title={hasProfile ? t('board.profile') : t('board.createProfile')}
          subtitle={hasProfile ? undefined : t('board.createProfileHint')}
          onPress={onProfile}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
