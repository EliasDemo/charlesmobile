import { render } from '@testing-library/react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { Platform } from 'react-native';
import { buildTheme, colors } from '@/shared/theme';
import { SystemBars, buildNavigationTheme } from '..';

jest.mock('expo-navigation-bar', () => ({ setStyle: jest.fn() }));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(async () => undefined) }));

describe('navigation theme', () => {
  it.each(['light', 'dark'] as const)('uses the %s tokens for headers and backgrounds', (scheme) => {
    const theme = buildNavigationTheme(buildTheme(scheme));
    expect(theme.dark).toBe(scheme === 'dark');
    expect(theme.colors).toMatchObject({
      background: colors[scheme].background,
      card: colors[scheme].surface,
      text: colors[scheme].textPrimary,
      border: colors[scheme].border,
    });
  });
});

describe('SystemBars', () => {
  beforeEach(() => jest.clearAllMocks());

  it('paints the root background and the Android navigation bar with the theme', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<SystemBars />);
    // Tests run without a color scheme, which the app treats as dark.
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith(colors.dark.background);
    expect(NavigationBar.setStyle).toHaveBeenCalledWith('dark');
  });

  it('does not touch the navigation bar on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await render(<SystemBars />);
    expect(NavigationBar.setStyle).not.toHaveBeenCalled();
  });
});
