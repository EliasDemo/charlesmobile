import { fireEvent, render, screen } from '@testing-library/react-native';
import { MIN_TEXT_CONTRAST, buildTheme, contrastRatio, type ColorScheme } from '@/shared/theme';
import { Button, buttonColors, type ButtonVariant } from '../Button';

const schemes: ColorScheme[] = ['light', 'dark'];
const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const states = ['normal', 'pressed', 'disabled'] as const;

describe.each(schemes)('button contrast in the %s theme', (scheme) => {
  const theme = buildTheme(scheme);
  it.each(variants.flatMap((v) => states.map((s) => [v, s] as const)))(
    '%s %s is readable',
    (variant, state) => {
      const colors = buttonColors(theme, variant, state);
      // Transparent buttons sit on the screen background or on a card.
      const backgrounds =
        colors.background === 'transparent'
          ? [theme.colors.background, theme.colors.surface]
          : [colors.background];
      for (const background of backgrounds) {
        expect(contrastRatio(theme.colors[colors.text], background)).toBeGreaterThanOrEqual(
          MIN_TEXT_CONTRAST,
        );
      }
    },
  );
});

describe('Button', () => {
  it('keeps the normal colors and a spinner while loading, and blocks presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="Enviar" loading onPress={onPress} />);
    const theme = buildTheme('dark');
    expect(screen.getByTestId('button-spinner').props.color).toBe(theme.colors.onPrimary);
    expect(screen.getByText('Enviar')).toHaveStyle({ color: theme.colors.onPrimary });
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });

  it('uses the disabled tokens instead of transparency', async () => {
    await render(<Button label="Enviar" disabled />);
    expect(screen.getByText('Enviar')).toHaveStyle({ color: buildTheme('dark').colors.onDisabled });
  });

  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Enviar" variant="secondary" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});
