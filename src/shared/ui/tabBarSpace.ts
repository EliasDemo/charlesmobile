import { useContext } from 'react';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';

/**
 * Height of the floating (translucent) tab bar when the screen is a tab, 0 elsewhere: scrollable
 * content adds it at the bottom so nothing stays hidden behind the bar.
 */
export function useTabBarSpace(): number {
  return useContext(BottomTabBarHeightContext) ?? 0;
}
