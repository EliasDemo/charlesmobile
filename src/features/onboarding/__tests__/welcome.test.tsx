import { fireEvent, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { renderWithProviders, resetAppState } from '@test/render';
import texts from '@/shared/i18n/locales/es/onboarding.json';
import { WelcomeScreen, loadWelcomeSeen, useWelcomeStore } from '..';

beforeEach(() => {
  resetAppState();
  useWelcomeStore.setState({ seen: null });
});

describe('welcome', () => {
  it('is pending on a fresh install and done after "Saltar"', async () => {
    await loadWelcomeSeen();
    expect(useWelcomeStore.getState().seen).toBe(false);
    const onDone = jest.fn();
    await renderWithProviders(<WelcomeScreen onDone={onDone} />);
    expect(screen.getByText(texts.pages.find.title)).toBeTruthy();
    // "Saltar" goes to the last page, where the person chooses how to use Charles.
    await fireEvent.press(screen.getByText(texts.skip));
    await fireEvent.press(screen.getByText(texts.choose.client));
    expect(onDone).toHaveBeenCalledWith('client');
    expect(useWelcomeStore.getState().seen).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('charles.welcomeSeen', 'true');
  });

  it('is not shown again after it was seen', async () => {
    await SecureStore.setItemAsync('charles.welcomeSeen', 'true');
    await loadWelcomeSeen();
    expect(useWelcomeStore.getState().seen).toBe(true);
  });

  it('goes page by page and ends choosing how to use Charles', async () => {
    const onDone = jest.fn();
    await renderWithProviders(<WelcomeScreen onDone={onDone} />);
    expect(screen.getByLabelText('Página 1 de 5')).toBeTruthy();
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByText(texts.next));
    expect(screen.getByLabelText('Página 5 de 5')).toBeTruthy();
    await fireEvent.press(screen.getByText(texts.choose.shop));
    expect(onDone).toHaveBeenCalledWith('shop');
  });

  it('counts a storage error as seen, so it never blocks the app', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keystore'));
    await loadWelcomeSeen();
    expect(useWelcomeStore.getState().seen).toBe(true);
  });
});
