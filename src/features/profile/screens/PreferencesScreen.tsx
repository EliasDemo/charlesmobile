import { StyleSheet, View } from 'react-native';
import { PushPermissionNotice } from '@/features/notifications';
import { useLanguage, useTranslation } from '@/shared/i18n';
import { spacing } from '@/shared/theme';
import { Notice, QueryView, Screen, SegmentedControl, SwitchRow, Text } from '@/shared/ui';
import { NOTIFICATION_CHANNELS, usePreferences } from '../hooks/usePreferences';

export function PreferencesScreen() {
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
});
