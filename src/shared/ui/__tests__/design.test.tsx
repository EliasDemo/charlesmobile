import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import common from '@/shared/i18n/locales/es/common.json';
import {
  BrandImage,
  EmptyState,
  GENERIC_CATEGORY_ICON,
  InfoCard,
  SegmentedControl,
  SkeletonList,
  StatusPill,
  categoryIcon,
} from '..';

describe('StatusPill', () => {
  it.each(['pending', 'success', 'neutral', 'danger'] as const)(
    '%s shows an icon and a label',
    async (tone) => {
      await render(<StatusPill tone={tone} icon="time" label="Estado" />);
      const pill = screen.getByTestId(`status-${tone}`);
      expect(pill.props.accessibilityLabel).toBe('Estado');
      expect(screen.getByText('Estado')).toBeTruthy();
    },
  );
});

describe('categoryIcon', () => {
  it('maps known categories and falls back for unknown ones', () => {
    expect(categoryIcon('haircut')).toBe('cut');
    expect(categoryIcon('new_category')).toBe(GENERIC_CATEGORY_ICON);
    expect(categoryIcon(null)).toBe(GENERIC_CATEGORY_ICON);
  });
});

describe('InfoCard', () => {
  it('shows main data, subtitle and only the details it receives', async () => {
    await render(
      <InfoCard title="Principal" subtitle="Secundario" details={[{ icon: 'navigate', text: '1 km' }]} />,
    );
    expect(screen.getByText('Principal')).toBeTruthy();
    expect(screen.getByText('Secundario')).toBeTruthy();
    expect(screen.getByText('1 km')).toBeTruthy();
  });
});

describe('BrandImage', () => {
  it('shows an icon illustration while there is no photo, labeled as illustrative', async () => {
    await render(
      <BrandImage
        imageKeys={['cover-haircut', 'cover-generic']}
        fallbackIcon="cut"
        height={160}
        illustrative
      />,
    );
    expect(screen.getByTestId('brand-image')).toBeTruthy();
    expect(screen.getByText(common.illustrative)).toBeTruthy();
  });

  it('has no label when it is only decoration', async () => {
    await render(<BrandImage imageKeys={['welcome-find']} fallbackIcon="search" height={160} />);
    expect(screen.queryByText(common.illustrative)).toBeNull();
  });
});

describe('skeletons', () => {
  afterEach(() => jest.restoreAllMocks());

  it('pulse and are announced as loading', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await render(<SkeletonList count={2} />);
    expect(screen.getByTestId('loading-state').props.accessibilityLabel).toBe(common.states.loading);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('stay still when the system asks to reduce motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<SkeletonList count={1} />);
    await act(async () => undefined);
    expect(screen.getAllByTestId('skeleton-still').length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
  });
});

describe('EmptyState and SegmentedControl', () => {
  it('shows an illustration when given an icon', async () => {
    await render(<EmptyState title="Vacío" icon="calendar-outline" />);
    expect(screen.getByText('Vacío')).toBeTruthy();
  });

  it('can keep its label for screen readers only (no duplicate title)', async () => {
    await render(
      <SegmentedControl
        label="Reservas"
        hideLabel
        value="a"
        onChange={jest.fn()}
        options={[
          { value: 'a', label: 'Próximas' },
          { value: 'b', label: 'Historial' },
        ]}
      />,
    );
    expect(screen.queryByText('Reservas')).toBeNull();
    expect(screen.getByLabelText('Reservas')).toBeTruthy();
  });
});
