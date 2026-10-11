import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate } from '@/shared/lib';
import { sizes, spacing } from '@/shared/theme';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  InfoCard,
  Monogram,
  Notice,
  QueryView,
  Screen,
  SegmentedControl,
  Text,
  TextField,
} from '@/shared/ui';
import type { MemberRole } from '../api/shopApi';
import { useMembers } from '../hooks/useMembers';
import { LIMITS } from '../schemas/limits';

const ROLES: MemberRole[] = ['OWNER', 'MANAGER'];

export function MembersScreen({ shopId }: { shopId: string }) {
  const { t } = useTranslation('shop');
  const m = useMembers(shopId);
  return (
    <Screen>
      {m.error ? <Notice tone="danger" message={m.error} /> : null}
      <QueryView
        query={m.members}
        skeletonCount={2}
        isEmpty={(list) => list.length === 0}
        empty={{ title: t('members.empty') }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((member) => (
              <InfoCard
                key={member.userId}
                leading={<Monogram name={member.fullName} size={sizes.avatarSmall} />}
                title={member.fullName}
                subtitle={t(`home.role.${member.role}`)}
                details={[
                  {
                    icon: 'calendar',
                    text: t('members.since', { date: formatLongDate(member.since, env.defaultTimeZone) }),
                  },
                ]}
                footer={
                  <View style={styles.row}>
                    {ROLES.map((role) => (
                      <Chip
                        key={role}
                        label={t(`home.role.${role}`)}
                        selected={member.role === role}
                        onPress={() => member.role !== role && m.changeRole(member.userId, role)}
                      />
                    ))}
                    <Button label={t('members.remove')} variant="ghost" onPress={() => m.askRemove(member)} />
                  </View>
                }
              />
            ))}
          </View>
        )}
      </QueryView>
      <Card>
        <Text variant="subtitle">{t('members.invite')}</Text>
        <TextField
          label={t('members.inviteEmail')}
          maxLength={LIMITS.email.max}
          keyboardType="email-address"
          autoCapitalize="none"
          value={m.email}
          onChangeText={m.setEmail}
        />
        <SegmentedControl
          label={t('members.inviteRole')}
          value={m.role}
          onChange={m.setRole}
          options={ROLES.map((role) => ({ value: role, label: t(`home.role.${role}`) }))}
        />
        {m.invitedTo ? (
          <Notice tone="success" message={t('members.inviteSent', { email: m.invitedTo })} />
        ) : null}
        <Button
          label={t('members.inviteSend')}
          onPress={m.sendInvite}
          loading={m.isInviting}
          disabled={!m.email.trim()}
          fullWidth
        />
      </Card>
      <ConfirmDialog
        visible={m.removing !== null}
        title={t('members.removeTitle', { name: m.removing?.fullName ?? '' })}
        message={t('members.removeMessage')}
        confirmLabel={t('members.removeConfirm')}
        onConfirm={m.confirmRemove}
        onCancel={m.cancelRemove}
        loading={m.isRemoving}
        destructive
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
