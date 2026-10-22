import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@test/render';
import common from '@/shared/i18n/locales/es/common.json';
import { useAppSettings } from '@/shared/lib';
import { UnlockHost, showUnlocked } from '../UnlockSheet';

const unlock = (onPress = jest.fn()) => ({
  id: 'unlock.test',
  title: 'Desbloqueaste algo',
  text: 'Esto es nuevo',
  items: [{ icon: 'briefcase' as const, title: 'Bolsa laboral', onPress }],
});

describe('UnlockSheet', () => {
  beforeEach(() => useAppSettings.getState().resetTours());

  it('shows what opened, goes to a function and is shown only once', async () => {
    await renderWithProviders(<UnlockHost />);
    const onPress = jest.fn();
    await act(async () => showUnlocked(unlock(onPress)));
    expect(screen.getByText('Desbloqueaste algo')).toBeTruthy();
    await fireEvent.press(screen.getByText('Bolsa laboral'));
    expect(onPress).toHaveBeenCalled();
    expect(screen.queryByText('Desbloqueaste algo')).toBeNull();

    await act(async () => showUnlocked(unlock()));
    expect(screen.queryByText('Desbloqueaste algo')).toBeNull();
  });

  it('closes with the done button', async () => {
    await renderWithProviders(<UnlockHost />);
    await act(async () => showUnlocked(unlock()));
    await fireEvent.press(screen.getByText(common.unlock.done));
    expect(screen.queryByText('Desbloqueaste algo')).toBeNull();
  });
});
