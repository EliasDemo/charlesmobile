import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, colors, useTheme, useThemePreference } from '..';

function SchemeProbe() {
  const theme = useTheme();
  return <Text testID="probe">{`${theme.scheme}:${theme.colors.background}`}</Text>;
}

describe('ThemeProvider', () => {
  beforeEach(() => useThemePreference.setState({ preference: 'system' }));

  it('applies a manual preference over the system scheme', async () => {
    await render(
      <ThemeProvider>
        <SchemeProbe />
      </ThemeProvider>,
    );
    await act(async () => useThemePreference.getState().setPreference('light'));
    expect(screen.getByTestId('probe').props.children).toBe(`light:${colors.light.background}`);
    await act(async () => useThemePreference.getState().setPreference('dark'));
    expect(screen.getByTestId('probe').props.children).toBe(`dark:${colors.dark.background}`);
  });
});
