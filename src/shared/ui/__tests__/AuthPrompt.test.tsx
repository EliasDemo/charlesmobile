import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@test/render';
import common from '@/shared/i18n/locales/es/common.json';
import { AuthPromptHost, askForAccount } from '../AuthPrompt';

describe('AuthPrompt', () => {
  it('explains why an account is needed and keeps the destination', async () => {
    const onLogin = jest.fn();
    const onRegister = jest.fn();
    await renderWithProviders(<AuthPromptHost onLogin={onLogin} onRegister={onRegister} />);
    expect(screen.queryByText(common.authPrompt.book.title)).toBeNull();

    await act(async () => askForAccount('book', '/book/summary'));
    expect(screen.getByText(common.authPrompt.book.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(common.authPrompt.register));
    expect(onRegister).toHaveBeenCalledWith('/book/summary');

    await act(async () => askForAccount('message', '/barbershop/1'));
    await fireEvent.press(screen.getByText(common.authPrompt.login));
    expect(onLogin).toHaveBeenCalledWith('/barbershop/1');
  });
});
