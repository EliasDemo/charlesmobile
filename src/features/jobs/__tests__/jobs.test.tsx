import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { apiError, mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import errors from '@/shared/i18n/locales/es/errors.json';
import texts from '@/shared/i18n/locales/es/jobs.json';
import { ApplicantsScreen, JobScreen, JobsScreen, MyApplicationsScreen } from '..';

type S = components['schemas'];

const posting = (overrides: Partial<S['JobPostingDto']> = {}): S['JobPostingDto'] => ({
  id: 'j1',
  barbershop: {
    id: 'shop-1',
    name: 'Barbería Demo',
    address: 'Av. Larco 123',
    logoUrl: null,
    ratingAverage: 4.6,
  },
  title: 'Barbero con experiencia',
  description: 'Buscamos barbero para fines de semana, con experiencia en degradados.',
  employmentType: 'WEEKENDS',
  compensationText: '50 % por servicio',
  styles: [],
  status: 'OPEN',
  closesAt: null,
  applicationsCount: 2,
  myApplicationStatus: null,
  createdAt: '2030-01-01T00:00:00.000Z',
  ...overrides,
});

const application = (overrides: Partial<S['JobApplicationDto']> = {}): S['JobApplicationDto'] => ({
  id: 'a1',
  postingId: 'j1',
  postingTitle: 'Barbero con experiencia',
  barbershopName: 'Barbería Demo',
  applicant: {
    barberProfileId: 'bp1',
    displayName: 'Julián',
    photoUrl: null,
    ratingAverage: 4.8,
    ratingCount: 10,
    yearsExperience: 4,
  },
  message: 'Me interesa',
  status: 'APPLIED',
  decidedAt: null,
  createdAt: '2030-01-02T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  resetAppState();
  signIn();
});

describe('JobsScreen', () => {
  it('filters by kind of job', async () => {
    const api = mockApi({
      'GET /api/v1/jobs': { body: { items: [posting()], nextCursor: null } },
      'GET /api/v1/service-styles': { body: [] },
    });
    await renderWithProviders(<JobsScreen onOpen={jest.fn()} />);
    expect(await screen.findByText('Barbero con experiencia')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filter-button'));
    await fireEvent.press(screen.getAllByText(texts.types.WEEKENDS)[0]!);
    await waitFor(() =>
      expect(
        api.fetchMock.mock.calls.some(([request]) => request.url.includes('employmentType=WEEKENDS')),
      ).toBe(true),
    );
  });
});

describe('JobScreen', () => {
  const props = () => ({
    id: 'j1',
    authenticated: true,
    onRequireLogin: jest.fn(),
    onRequireProfile: jest.fn(),
    onOpenShop: jest.fn(),
  });

  it('applies with a message', async () => {
    const api = mockApi({
      'GET /api/v1/jobs/{id}': { body: posting() },
      'POST /api/v1/jobs/{id}/applications': { status: 201, body: application() },
    });
    await renderWithProviders(<JobScreen {...props()} />);
    await fireEvent.changeText(await screen.findByLabelText(texts.message), 'Me interesa');
    await fireEvent.press(screen.getByRole('button', { name: texts.apply }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({ message: 'Me interesa' }),
    );
  });

  it('sends to create the professional profile when there is none (403)', async () => {
    mockApi({
      'GET /api/v1/jobs/{id}': { body: posting() },
      'POST /api/v1/jobs/{id}/applications': apiError(403, 'FORBIDDEN'),
    });
    const p = props();
    await renderWithProviders(<JobScreen {...p} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.apply }));
    await waitFor(() => expect(p.onRequireProfile).toHaveBeenCalled());
  });

  it('explains a closed posting', async () => {
    mockApi({
      'GET /api/v1/jobs/{id}': { body: posting() },
      'POST /api/v1/jobs/{id}/applications': apiError(409, 'JOB_POSTING_CLOSED'),
    });
    await renderWithProviders(<JobScreen {...props()} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.apply }));
    expect(await screen.findByText(errors.codes.JOB_POSTING_CLOSED)).toBeTruthy();
  });

  it('shows the state of an existing application instead of the button', async () => {
    mockApi({ 'GET /api/v1/jobs/{id}': { body: posting({ myApplicationStatus: 'SHORTLISTED' }) } });
    await renderWithProviders(<JobScreen {...props()} />);
    expect(await screen.findAllByText(texts.status.SHORTLISTED)).toBeTruthy();
    expect(screen.queryByRole('button', { name: texts.apply })).toBeNull();
  });
});

describe('MyApplicationsScreen', () => {
  it('withdraws an application after confirming', async () => {
    const api = mockApi({
      'GET /api/v1/me/job-applications': { body: [application()] },
      'POST /api/v1/me/job-applications/{id}/withdraw': { body: application({ status: 'WITHDRAWN' }) },
    });
    await renderWithProviders(<MyApplicationsScreen onOpenJob={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: texts.withdraw }));
    const buttons = screen.getAllByRole('button', { name: texts.withdraw });
    await fireEvent.press(buttons[buttons.length - 1]!);
    await waitFor(() =>
      expect(api.calls.some((c) => c.path === '/api/v1/me/job-applications/a1/withdraw')).toBe(true),
    );
  });

  it('explains the empty state', async () => {
    mockApi({ 'GET /api/v1/me/job-applications': { body: [] } });
    await renderWithProviders(<MyApplicationsScreen onOpenJob={jest.fn()} />);
    expect(await screen.findByText(texts.noApplications)).toBeTruthy();
  });
});

describe('ApplicantsScreen', () => {
  it('hires after confirming and leads to assign services', async () => {
    const api = mockApi({
      'GET /api/v1/barbershops/{barbershopId}/jobs/{id}/applications': { body: [application()] },
      'POST /api/v1/barbershops/{barbershopId}/job-applications/{id}/decision': {
        body: application({ status: 'HIRED' }),
      },
    });
    const onHired = jest.fn();
    await renderWithProviders(
      <ApplicantsScreen shopId="shop-1" jobId="j1" onOpenProfile={jest.fn()} onHired={onHired} />,
    );
    await fireEvent.press(await screen.findByRole('button', { name: texts.shop.hire }));
    const buttons = screen.getAllByRole('button', { name: texts.shop.hire });
    await fireEvent.press(buttons[buttons.length - 1]!);
    await waitFor(() => expect(onHired).toHaveBeenCalled());
    expect(api.calls.find((c) => c.method === 'POST')!.body).toEqual({ status: 'HIRED' });
  });
});
