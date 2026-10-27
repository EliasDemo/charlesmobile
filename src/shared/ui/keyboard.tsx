import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TurboModuleRegistry,
  View,
  type KeyboardEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Height of the on-screen keyboard (0 when hidden). With edge-to-edge on Android the window no
 * longer shrinks for the keyboard, so screens make room themselves.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e: KeyboardEvent) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export function useKeyboardVisible() {
  return useKeyboardHeight() > 0;
}

/**
 * `react-native-keyboard-controller` once the build includes it (rule 12: until then, the
 * installed build keeps working with the fallback above). Loaded lazily, only if its native
 * module exists.
 */
type KeyboardControllerLib = typeof import('react-native-keyboard-controller');
let keyboardLib: KeyboardControllerLib | null | undefined;
export function keyboardController(): KeyboardControllerLib | null {
  if (keyboardLib === undefined) {
    keyboardLib = TurboModuleRegistry.get('KeyboardController')
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('react-native-keyboard-controller') as KeyboardControllerLib)
      : null;
  }
  return keyboardLib;
}

/** Root wrapper: the library's provider when available, nothing otherwise. */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  const lib = keyboardController();
  return lib ? <lib.KeyboardProvider>{children}</lib.KeyboardProvider> : <>{children}</>;
}

/**
 * A screen with a field fixed at the bottom (chat, comments): it moves up with the keyboard. On
 * Android (edge-to-edge) the window no longer shrinks, so without the library it leaves the room itself.
 * `offset`: height above this view on iOS (a stack header).
 */
export function KeyboardAvoider({
  children,
  style,
  offset = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  offset?: number;
}) {
  const lib = keyboardController();
  const height = useKeyboardHeight();
  if (lib) {
    return (
      <lib.KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={style}>
        {children}
      </lib.KeyboardAvoidingView>
    );
  }
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={style}>
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <View style={[style, { paddingBottom: height }]}>{children}</View>;
}
