import { render, screen } from '@testing-library/react-native';
import { ApiError, NetworkError } from '@/shared/api';
import { QueryView, Text } from '..';

const query = (error: unknown) => ({ data: undefined, error, refetch: jest.fn() });

describe('development connection hint', () => {
  it('shows the configured URL and the Wi-Fi advice on network failures', async () => {
    await render(<QueryView query={query(new NetworkError())}>{() => <Text>x</Text>}</QueryView>);
    expect(screen.getByTestId('dev-connection-hint')).toBeTruthy();
    expect(screen.getByText('Servidor configurado: http://api.test')).toBeTruthy();
    expect(screen.getByText(/mismo wifi/)).toBeTruthy();
  });

  it('is not shown for errors answered by the server', async () => {
    await render(
      <QueryView query={query(new ApiError(404, { code: 'NOT_FOUND' }))}>{() => <Text>x</Text>}</QueryView>,
    );
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.queryByTestId('dev-connection-hint')).toBeNull();
  });
});
