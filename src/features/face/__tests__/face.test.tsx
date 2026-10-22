import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders, resetAppState } from '@test/render';
import texts from '@/shared/i18n/locales/es/face.json';
import { FaceScreen } from '..';

beforeEach(() => resetAppState());

describe('FaceScreen', () => {
  it('asks for consent first, and explains when this build cannot analyze faces', async () => {
    await renderWithProviders(<FaceScreen onBook={jest.fn()} onOpenBarber={jest.fn()} />);
    expect(screen.getByText(texts.consent.message)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.consent.accept }));
    expect(await screen.findByText(texts.scan.unavailable)).toBeTruthy();
    expect(screen.getByRole('button', { name: texts.scan.take })).toBeDisabled();
  });
});
