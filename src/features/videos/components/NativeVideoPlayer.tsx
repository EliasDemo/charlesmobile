import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

/**
 * The real player (expo-video). This file is only loaded when the module exists in the build
 * (`videoPlaybackAvailable()`), so older builds never touch it. No autoplay with sound: it starts
 * when the person taps play.
 */
export default function NativeVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

const styles = StyleSheet.create({ video: { width: '100%', aspectRatio: 9 / 16 } });
