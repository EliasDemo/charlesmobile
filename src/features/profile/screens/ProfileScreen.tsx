import { StyleSheet, View } from 'react-native';
import { SignInPrompt, useLogout } from '@/features/auth';
import { useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Button, Card, ConfirmDialog, ListRow, Notice, QueryView, Screen, Text } from '@/shared/ui';
import { useProfile } from '../hooks/useProfile';

export interface ProfileScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onVerifyEmail: (email: string) => void;
  onEditProfile: () => void;
  onPreferences: () => void;
  onFavorites: () => void;
  onWelcome: () => void;
  /** Development builds only. */
  onDesignSystem?: () => void;
  onLoggedOut: () => void;
}

export function ProfileScreen(props: ProfileScreenProps) {
  const { t } = useTranslation('profile');
  const { query, isAuthenticated, emailVerified } = useProfile();
  const logout = useLogout({ onDone: props.onLoggedOut });

  if (!isAuthenticated) return <SignInPrompt onLogin={props.onLogin} onRegister={props.onRegister} />;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Text variant="title">{t('title')}</Text>
      <QueryView query={query}>
        {(profile) => (
          <View style={styles.sections}>
            <Card>
              <Text variant="subtitle">{profile.fullName}</Text>
              <Text color="textSecondary" selectable>
                {profile.email}
              </Text>
            </Card>
            {!emailVerified ? (
              <Notice tone="warning" title={t('unverified.title')} message={t('unverified.message')}>
                <Button
                  label={t('unverified.action')}
                  variant="secondary"
                  onPress={() => props.onVerifyEmail(profile.email)}
                />
              </Notice>
            ) : null}
            <View>
              <Text variant="label" color="textSecondary">
                {t('sections.account')}
              </Text>
              <ListRow title={t('phone')} value={profile.phone ?? t('noPhone')} />
              <ListRow title={t('edit.title')} onPress={props.onEditProfile} />
            </View>
            <View>
              <Text variant="label" color="textSecondary">
                {t('sections.settings')}
              </Text>
              <ListRow title={t('favorites')} onPress={props.onFavorites} />
              <ListRow title={t('preferences.title')} onPress={props.onPreferences} />
              <ListRow title={t('welcomeAgain')} onPress={props.onWelcome} />
              {props.onDesignSystem ? <ListRow title={t('devTools')} onPress={props.onDesignSystem} /> : null}
            </View>
          </View>
        )}
      </QueryView>
      <View style={styles.session}>
        <Text variant="label" color="textSecondary">
          {t('sections.session')}
        </Text>
        <Button
          label={t('logout.action', { ns: 'auth' })}
          variant="secondary"
          onPress={logout.logout}
          loading={logout.isLoggingOut && !logout.confirmingAll}
          disabled={logout.isLoggingOut}
        />
        <Button
          label={t('logout.allDevices', { ns: 'auth' })}
          variant="ghost"
          onPress={logout.askLogoutAll}
          disabled={logout.isLoggingOut}
        />
      </View>
      <ConfirmDialog
        visible={logout.confirmingAll}
        title={t('logout.confirmTitle', { ns: 'auth' })}
        message={t('logout.confirmMessage', { ns: 'auth' })}
        confirmLabel={t('logout.confirm', { ns: 'auth' })}
        onConfirm={logout.confirmLogoutAll}
        onCancel={logout.cancelLogoutAll}
        loading={logout.isLoggingOut}
        destructive
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.lg },
  session: { gap: spacing.sm },
});
