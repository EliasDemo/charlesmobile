import { StyleSheet, View } from 'react-native';
import { PushPermissionNotice } from '@/features/notifications';
import { useLanguage, useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { ListRow, Notice, QueryView, Screen, SegmentedControl, SwitchRow, Text } from '@/shared/ui';
import { env } from '@/shared/config';
import { openSystemSettings, soundsAvailable, useAppSettings } from '@/shared/lib';
import { NOTIFICATION_CHANNELS, usePreferences } from '../hooks/usePreferences';

export interface PreferencesScreenProps {
  /** Shows the welcome and the guided tour again. */
  onReplayTutorial: () => void;
  onChangePassword: () => void;
  onHelp: () => void;
}

export function PreferencesScreen({ onReplayTutorial, onChangePassword, onHelp }: PreferencesScreenProps) {
  const settings = useAppSettings();
  const { t } = useTranslation('profile');
  const { query, channels, toggleChannel, isSaving, saveError, themePreference, setThemePreference } =
    usePreferences();
  const language = useLanguage((st) => st.preference);
  const setLanguage = useLanguage((st) => st.setPreference);
  return (
    <Screen>
      <PushPermissionNotice />
      <SegmentedControl
        label={t('preferences.theme')}
        value={themePreference}
        onChange={setThemePreference}
        options={[
          { value: 'system', label: t('preferences.themeSystem') },
          { value: 'light', label: t('preferences.themeLight') },
          { value: 'dark', label: t('preferences.themeDark') },
        ]}
      />
      <SegmentedControl
        label={t('preferences.language')}
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'system', label: t('preferences.languageSystem') },
          { value: 'es', label: 'Español' },
          { value: 'en', label: 'English' },
        ]}
      />
      <View style={styles.section}>
        <Text variant="subtitle">{t('preferences.notifications')}</Text>
        <Notice message={t('preferences.notificationsSoon')} />
        {saveError ? <Notice tone="danger" message={saveError} /> : null}
        <QueryView query={query}>
          {() => (
            <View>
              {NOTIFICATION_CHANNELS.map((channel) => (
                <SwitchRow
                  key={channel}
                  title={t(`preferences.channels.${channel}`)}
                  value={channels.includes(channel)}
                  onValueChange={(enabled) => toggleChannel(channel, enabled)}
                  disabled={isSaving}
                />
              ))}
            </View>
          )}
        </QueryView>
      </View>
      <View style={styles.section}>
        <Text variant="subtitle">{t('settings.feedback')}</Text>
        <SwitchRow
          title={t('settings.sounds')}
          subtitle={soundsAvailable() ? t('settings.soundsHint') : t('settings.soundsSoon')}
          value={settings.sounds}
          onValueChange={(sounds) => settings.set({ sounds })}
        />
        <SwitchRow
          title={t('settings.haptics')}
          subtitle={t('settings.hapticsHint')}
          value={settings.haptics}
          onValueChange={(haptics) => settings.set({ haptics })}
        />
      </View>
      <View style={styles.section}>
        <Text variant="subtitle">{t('settings.help')}</Text>
        <ListRow
          icon="school"
          title={t('settings.tutorial')}
          onPress={() => {
            settings.resetTours();
            onReplayTutorial();
          }}
        />
        <ListRow icon="help-buoy" title={t('settings.support')} onPress={onHelp} />
      </View>
      <View style={styles.section}>
        <Text variant="subtitle">{t('settings.privacy')}</Text>
        <ListRow icon="key" title={t('password.title')} onPress={onChangePassword} />
        <ListRow icon="shield-checkmark" title={t('settings.permissions')} onPress={openSystemSettings} />
        <Text variant="caption" color="textMuted">
          {t('settings.permissionsHint')}
        </Text>
      </View>
      <View style={styles.section}>
        <Text variant="subtitle">{t('settings.about')}</Text>
        <ListRow icon="information-circle" title={t('settings.version')} value={env.appVersion} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
});
