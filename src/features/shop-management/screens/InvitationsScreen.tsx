import { StyleSheet, View } from 'react-native';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatLongDate } from '@/shared/lib';
import { spacing } from '@/shared/theme';
import { Button, Card, Notice, QueryView, Screen, Text, TextField } from '@/shared/ui';
import { useInvitations } from '../hooks/useInvitations';

/** Invitations to join a barbershop, accepted with the code sent by email. */
export function InvitationsScreen() {
  const { t } = useTranslation('shop');
  const inv = useInvitations();
  return (
    <Screen>
      {inv.accepted ? (
        <Notice tone="success" message={t('invitations.accepted', { shop: inv.accepted.barbershopName })} />
      ) : null}
      {inv.error ? <Notice tone="danger" message={inv.error} /> : null}
      <QueryView
        query={inv.invitations}
        skeletonCount={2}
        isEmpty={(list) => list.length === 0}
        empty={{ title: t('invitations.empty'), icon: 'mail-open-outline' }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((invitation) => (
              <Card key={invitation.id}>
                <Text variant="bodyStrong">
                  {invitation.kind === 'BARBER'
                    ? t('invitations.asBarber', {
                        name: invitation.barberDisplayName ?? '',
                        shop: invitation.barbershopName,
                      })
                    : t('invitations.asMember', {
                        role: invitation.memberRole ? t(`home.role.${invitation.memberRole}`) : '',
                        shop: invitation.barbershopName,
                      })}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {t('invitations.expires', {
                    date: formatLongDate(invitation.expiresAt, env.defaultTimeZone),
                  })}
                </Text>
                <TextField
                  label={t('invitations.code')}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={inv.code(invitation.id)}
                  onChangeText={(code) => inv.setCode(invitation.id, code)}
                />
                <Button
                  label={t('invitations.accept')}
                  onPress={() => inv.accept(invitation)}
                  loading={inv.acceptingId === invitation.id}
                  disabled={!inv.code(invitation.id).trim()}
                  fullWidth
                />
              </Card>
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
});
