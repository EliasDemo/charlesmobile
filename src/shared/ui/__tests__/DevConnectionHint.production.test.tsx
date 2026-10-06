import { render, screen } from '@testing-library/react-native';
import { NetworkError } from '@/shared/api';
import { DevConnectionHint } from '../DevConnectionHint';
import { QueryView, Text } from '..';

// Any variant other than development (preview, production) behaves like this.
jest.mock('@/shared/config', () => ({
  env: { ...jest.requireActual('@/shared/config').env, isDevelopment: false },
}));

describe('development connection hint outside development', () => {
  it('does not exist', async () => {
    await render(
      <>
        <QueryView query={{ data: undefined, error: new NetworkError(), refetch: jest.fn() }}>
          {() => <Text>x</Text>}
        </QueryView>
        <DevConnectionHint />
      </>,
    );
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.queryByTestId('dev-connection-hint')).toBeNull();
  });
});
