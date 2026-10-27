import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/shared/i18n';
import { sizes, spacing, useTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

/**
 * A brand's short video (expo-video): plays on a loop without sound, and tapping turns the sound
 * on or off (TIENDA.md). Only loaded when the module exists in the installed build.
 */
export default function NativeMutedVideo({ uri }: { uri: string }) {
  const { t } = useTranslation('ads');
  const theme = useTheme();
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const toggle = () => {
    setPlayerMuted(player, !muted);
    setMuted(!muted);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={muted ? t('store.soundOn') : t('store.soundOff')}
      onPress={toggle}
      style={StyleSheet.absoluteFill}
    >
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <View
        style={[styles.sound, { backgroundColor: theme.colors.backdrop, borderRadius: theme.radius.pill }]}
      >
        <Icon
          name={muted ? 'volume-mute' : 'volume-high'}
          size={sizes.icon - spacing.xs}
          color={theme.colors.onPrimary}
        />
      </View>
    </Pressable>
  );
}

/** The player is a native object: its sound is switched on it, not through React state. */
function setPlayerMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

const styles = StyleSheet.create({
  sound: { position: 'absolute', right: spacing.sm, bottom: spacing.sm, padding: spacing.xs },
});
