import { fireEvent, render, screen } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { act } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '@/shared/api';
import common from '@/shared/i18n/locales/es/common.json';
import errors from '@/shared/i18n/locales/es/errors.json';
import { Button, ErrorFallback, OfflineBanner, PlaceholderScreen, QueryView, Text, TextField } from '..';

const baseQuery = { data: undefined, error: null, refetch: jest.fn() };

describe('QueryView', () => {
  it('shows loading', async () => {
    await render(<QueryView query={baseQuery}>{() => <Text>datos</Text>}</QueryView>);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('shows the translated error and retries', async () => {
    const refetch = jest.fn();
    await render(
      <QueryView query={{ ...baseQuery, error: new ApiError(404, { code: 'NOT_FOUND' }), refetch }}>
        {() => <Text>datos</Text>}
      </QueryView>,
    );
    expect(screen.getByText(errors.codes.NOT_FOUND)).toBeTruthy();
    await fireEvent.press(screen.getByText(common.actions.retry));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows empty', async () => {
    await render(
      <QueryView
        query={{ ...baseQuery, data: [] as string[] }}
        isEmpty={(d) => d.length === 0}
        empty={{ message: 'nada' }}
      >
        {() => <Text>datos</Text>}
      </QueryView>,
    );
    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('nada')).toBeTruthy();
  });

  it('shows data, and keeps cached data when a refetch fails', async () => {
    await render(
      <QueryView
        query={{ ...baseQuery, data: ['a'], error: new Error('offline') }}
        isEmpty={(d) => d.length === 0}
      >
        {(d) => <Text>{d.join(',')}</Text>}
      </QueryView>,
    );
    expect(screen.getByText('a')).toBeTruthy();
  });
});

describe('Button', () => {
  it('blocks presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Enviar" loading onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });

  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Enviar" variant="secondary" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('shows the error next to the field and reports focus changes', async () => {
    const onBlur = jest.fn();
    await render(<TextField label="Correo" error="Inválido" hint="pista" onBlur={onBlur} />);
    expect(screen.getByText('Inválido')).toBeTruthy();
    expect(screen.queryByText('pista')).toBeNull();
    const input = screen.getByLabelText('Correo');
    await fireEvent(input, 'focus');
    await fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalled();
  });

  it('shows the hint when there is no error', async () => {
    await render(<TextField label="Correo" hint="pista" />);
    expect(screen.getByText('pista')).toBeTruthy();
  });
});

describe('ErrorFallback', () => {
  it('offers a retry without showing technical details', async () => {
    const onRetry = jest.fn();
    await render(<ErrorFallback onRetry={onRetry} />);
    expect(screen.getByText(common.crash.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(common.actions.retry));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('OfflineBanner', () => {
  it('appears only while offline', async () => {
    const metrics = {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    };
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <OfflineBanner />
      </SafeAreaProvider>,
    );
    expect(screen.queryByText(common.offline.banner)).toBeNull();
    await act(async () => onlineManager.setOnline(false));
    expect(screen.getByText(common.offline.banner)).toBeTruthy();
    await act(async () => onlineManager.setOnline(true));
  });
});

describe('PlaceholderScreen', () => {
  it('explains the screen is coming', async () => {
    await render(<PlaceholderScreen title="Agenda" />);
    expect(screen.getByText(common.placeholder.comingSoon)).toBeTruthy();
  });
});
