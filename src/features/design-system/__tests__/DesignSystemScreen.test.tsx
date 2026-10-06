import { render, screen } from '@testing-library/react-native';
import common from '@/shared/i18n/locales/es/common.json';
import { DesignSystemScreen } from '..';

describe('DesignSystemScreen', () => {
  it('renders every section of the catalog', async () => {
    await render(<DesignSystemScreen />);
    for (const section of ['typography', 'buttons', 'fields', 'money', 'states'] as const) {
      expect(screen.getByText(common.designSystem[section])).toBeTruthy();
    }
  });
});
