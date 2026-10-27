import { Pressable, StyleSheet, View } from 'react-native';
import { SignInPrompt, useLogout } from '@/features/auth';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, touchTarget, useTheme } from '@/shared/theme';
import {
  ActionTile,
  Button,
  Card,
  ConfirmDialog,
  Icon,
  ListRow,
  Monogram,
  Notice,
  QueryView,
  Screen,
  Text,
  TileGrid,
} from '@/shared/ui';
import { useProfile } from '../hooks/useProfile';

export interface ProfileScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onVerifyEmail: (email: string) => void;
  onEditProfile: () => void;
  onChangePassword: () => void;
  /** "Mi perfil profesional" (barbers, or anyone who wants to become one). */
  onCareer: () => void;
  onMemberships: () => void;
  onPreferences: () => void;
  onFavorites: () => void;
  onWaitlist: () => void;
  onNotifications: () => void;
  onHelp: () => void;
  onMyReviews: () => void;
  onWelcome: () => void;
  onDeleteAccount: () => void;
  /** Mode the account would switch to; absent when it has no barbershop role. */
  switchModeTo?: 'client' | 'shop';
  onSwitchMode: () => void;
  onCreateShop: () => void;
  onInvitations: () => void;
  /** Development builds only. */
  onDesignSystem?: () => void;
  onLoggedOut: () => void;
}

/**
 * "Perfil", from the most used to the least: who I am, what is mine (favorites, reviews…), the
 * professional side, account and settings, help, and the session at the end.
 */
export function ProfileScreen(props: ProfileScreenProps) {
  const { t } = useTranslation('profile');
  const theme = useTheme();
  const { query, isAuthenticated, emailVerified } = useProfile();
  const logout = useLogout({ onDone: props.onLoggedOut });

  if (!isAuthenticated) return <SignInPrompt onLogin={props.onLogin} onRegister={props.onRegister} />;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <QueryView query={query}>
        {(profile) => (
          <View style={styles.sections}>
            <View
              style={[styles.hero, { backgroundColor: theme.colors.brand, borderRadius: theme.radius.xl }]}
            >
              <View style={[styles.photoRing, { borderColor: theme.colors.brandAccent }]}>
                <Monogram name={profile.fullName} size={sizes.avatarLarge} imageUrl={profile.photoUrl} />
              </View>
              <View style={styles.heroTexts}>
                <Text variant="title" color="onBrand" align="center" numberOfLines={2}>
                  {profile.fullName}
                </Text>
                <Text color="brandAccent" align="center" numberOfLines={1}>
                  {`@${profile.username}`}
                </Text>
                <Text variant="caption" color="onBrand" align="center" numberOfLines={1} selectable>
                  {profile.email}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={props.onEditProfile}
                style={({ pressed }) => [
                  styles.editPill,
                  {
                    borderColor: theme.colors.brandAccent,
                    borderRadius: theme.radius.pill,
                    backgroundColor: pressed ? theme.colors.brandAccent : 'transparent',
                  },
                ]}
              >
                {({ pressed }) => (
                  <>
                    <Icon
                      name="create-outline"
                      size={sizes.icon - spacing.xs}
                      color={pressed ? theme.colors.brand : theme.colors.brandAccent}
                    />
                    <Text variant="label" color={pressed ? 'onPrimary' : 'brandAccent'}>
                      {t('edit.title')}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {!emailVerified ? (
              <Notice tone="warning" title={t('unverified.title')} message={t('unverified.message')}>
                <Button
                  label={t('unverified.action')}
                  variant="secondary"
                  onPress={() => props.onVerifyEmail(profile.email)}
                />
              </Notice>
            ) : null}

            <Section title={t('sections.mine')}>
              <TileGrid>
                <ActionTile icon="heart" label={t('favorites')} onPress={props.onFavorites} />
                <ActionTile
                  icon="star"
                  label={t('mine.title', { ns: 'reviews' })}
                  onPress={props.onMyReviews}
                />
                <ActionTile
                  icon="card"
                  label={t('title', { ns: 'memberships' })}
                  onPress={props.onMemberships}
                />
                <ActionTile
                  icon="notifications"
                  label={t('title', { ns: 'notifications' })}
                  onPress={props.onNotifications}
                />
                <ActionTile
                  icon="hourglass"
                  label={t('title', { ns: 'waitlist' })}
                  onPress={props.onWaitlist}
                />
              </TileGrid>
            </Section>

            <Section title={t('sections.pro')}>
              {props.switchModeTo ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={props.onSwitchMode}
                  style={({ pressed }) => [
                    styles.modeCard,
                    {
                      backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
                      borderRadius: theme.radius.lg,
                    },
                  ]}
                  testID="profile-switch-mode"
                >
                  <Icon
                    name="swap-horizontal"
                    size={sizes.icon + spacing.xs}
                    color={theme.colors.onPrimary}
                  />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" color="onPrimary">
                      {t(props.switchModeTo === 'shop' ? 'mode.toShop' : 'mode.toClient', { ns: 'shop' })}
                    </Text>
                    <Text variant="caption" color="onPrimary">
                      {t(props.switchModeTo === 'shop' ? 'pro.toShopHint' : 'pro.toClientHint')}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={sizes.icon} color={theme.colors.onPrimary} />
                </Pressable>
              ) : (
                <Card>
                  <View style={styles.promo}>
                    <Text variant="subtitle">{t('pro.promoTitle')}</Text>
                    <Text color="textSecondary">{t('pro.promoText')}</Text>
                    <Button
                      label={t('mode.create', { ns: 'shop' })}
                      icon="storefront"
                      onPress={props.onCreateShop}
                      fullWidth
                    />
                  </View>
                </Card>
              )}
              <Card>
                <ListRow icon="cut" title={t('title', { ns: 'career' })} onPress={props.onCareer} />
                <ListRow
                  icon="mail"
                  title={t('mode.invitations', { ns: 'shop' })}
                  onPress={props.onInvitations}
                />
                {props.switchModeTo ? (
                  <ListRow
                    icon="add-circle"
                    title={t('mode.create', { ns: 'shop' })}
                    onPress={props.onCreateShop}
                  />
                ) : null}
              </Card>
            </Section>

            <Section title={t('sections.account')}>
              <Card>
                <ListRow icon="call" title={t('phone')} value={profile.phone ?? t('noPhone')} />
                <ListRow icon="key" title={t('password.title')} onPress={props.onChangePassword} />
                <ListRow icon="settings" title={t('preferences.title')} onPress={props.onPreferences} />
              </Card>
            </Section>

            <Section title={t('sections.help')}>
              <Card>
                <ListRow icon="help-buoy" title={t('title', { ns: 'support' })} onPress={props.onHelp} />
                <ListRow icon="sparkles" title={t('welcomeAgain')} onPress={props.onWelcome} />
                {props.onDesignSystem ? (
                  <ListRow icon="construct" title={t('devTools')} onPress={props.onDesignSystem} />
                ) : null}
              </Card>
            </Section>
          </View>
        )}
      </QueryView>

      <Section title={t('sections.session')}>
        <Card>
          <View style={styles.session}>
            <Button
              label={t('logout.action', { ns: 'auth' })}
              icon="log-out-outline"
              variant="secondary"
              onPress={logout.logout}
              loading={logout.isLoggingOut && !logout.confirmingAll}
              disabled={logout.isLoggingOut}
              fullWidth
            />
            <Button
              label={t('logout.allDevices', { ns: 'auth' })}
              variant="ghost"
              onPress={logout.askLogoutAll}
              disabled={logout.isLoggingOut}
              fullWidth
            />
          </View>
        </Card>
        <Card>
          <ListRow icon="trash" title={t('deleteAccount')} onPress={props.onDeleteAccount} destructive />
        </Card>
      </Section>
      <Text variant="caption" color="textMuted" align="center">
        {t('version', { version: env.appVersion })}
      </Text>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color="textSecondary" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  section: { gap: spacing.sm },
  flex: { flex: 1 },
  hero: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  photoRing: { borderWidth: 3, borderRadius: sizes.avatarLarge, padding: spacing.xxs },
  heroTexts: { gap: spacing.xxs, alignSelf: 'stretch' },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    borderWidth: sizes.borderWidth,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    minHeight: touchTarget * 1.5,
  },
  promo: { gap: spacing.sm },
  session: { gap: spacing.xs },
});
