import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders, resetAppState } from '@test/render';
import common from '@/shared/i18n/locales/es/common.json';
import { useAppSettings } from '@/shared/lib';
import { GuideBanner, guideKey } from '..';

const steps = [
  { icon: 'time' as const, title: 'Primero', text: 'Paso uno' },
  { icon: 'cafe' as const, title: 'Segundo', text: 'Paso dos', tip: 'Un consejo' },
];

beforeEach(() => {
  resetAppState();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('GuideBanner', () => {
  it('opens by itself the first time, walks the steps and is remembered', async () => {
    useAppSettings.setState({ toursSeen: [] });
    await renderWithProviders(
      <GuideBanner id="cash" icon="wallet" title="Caja" summary="Resumen" steps={steps} />,
    );
    await act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText('Primero')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: common.guide.next }));
    expect(screen.getByText('Un consejo')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: common.guide.done }));
    expect(useAppSettings.getState().toursSeen).toContain(guideKey('cash'));
  });

  it('stays closed once seen, and opens from "¿Cómo funciona?"', async () => {
    await renderWithProviders(
      <GuideBanner id="cash" icon="wallet" title="Caja" summary="Resumen" steps={steps} />,
    );
    await act(() => jest.advanceTimersByTime(1000));
    expect(screen.queryByText('Primero')).toBeNull();
    await fireEvent.press(screen.getByTestId('guide-cash'));
    expect(screen.getByText('Primero')).toBeTruthy();
  });
});
