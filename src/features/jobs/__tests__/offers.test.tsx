import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mockApi } from '@test/mockApi';
import { renderWithProviders, resetAppState, signIn } from '@test/render';
import type { components } from '@/shared/api';
import texts from '@/shared/i18n/locales/es/jobs.json';
import { MyOffersScreen, OfferJobScreen } from '..';

type S = components['schemas'];

const offer = (o: Partial<S['JobOfferDto']> = {}): S['JobOfferDto'] => ({
  id: 'of1',
  barberName: 'Julián',
  barberProfileId: 'bp1',
  barbershop: {
    id: 'shop-1',
    name: 'Barbería Imperial',
    address: 'Jr. San Román 345',
    logoUrl: null,
    ratingAverage: 4.7,
  },
  createdAt: '2030-01-01T10:00:00.000Z',
  employmentType: 'FULL_TIME',
  expiresAt: '2030-01-08T10:00:00.000Z',
  message: 'Te queremos en el equipo',
  payMin: 150000,
  payMax: 180000,
  payPeriod: 'MONTH',
  payType: 'FIXED',
  respondedAt: null,
  responseNote: null,
  schedule: 'Martes a sábado',
  status: 'PENDING',
  title: 'Barbero de planta',
  ...o,
});

beforeEach(() => {
  resetAppState();
  signIn({ roles: ['CLIENT', 'BARBER'] });
});

describe('MyOffersScreen', () => {
  it('accepts an offer after confirming that the barber joins the team', async () => {
    const api = mockApi({
      'GET /api/v1/me/job-offers': {
        body: [offer(), offer({ id: 'of2', status: 'EXPIRED', title: 'Fin de semana' })],
      },
      'POST /api/v1/me/job-offers/{offerId}/accept': { body: offer({ status: 'ACCEPTED' }) },
    } as never);
    const onAccepted = jest.fn();
    await renderWithProviders(<MyOffersScreen onAccepted={onAccepted} />);
    expect(await screen.findByText('Barbero de planta')).toBeTruthy();
    expect(screen.getByText(texts.offers.status.EXPIRED)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: texts.offers.accept }));
    const buttons = screen.getAllByRole('button', { name: texts.offers.accept });
    await fireEvent.press(buttons[buttons.length - 1]!);
    await waitFor(() => expect(onAccepted).toHaveBeenCalled());
    expect(api.calls.some((c) => c.method === 'POST' && c.path.endsWith('/of1/accept'))).toBe(true);
  });
});

describe('OfferJobScreen', () => {
  it('sends the offer with pay in céntimos, period and days', async () => {
    const api = mockApi({
      'POST /api/v1/barbershops/{barbershopId}/job-offers': { status: 201, body: offer() },
    } as never);
    const onSent = jest.fn();
    await renderWithProviders(
      <OfferJobScreen shopId="shop-1" barberProfileId="bp1" barberName="Julián" onSent={onSent} />,
    );
    await fireEvent.changeText(screen.getByLabelText(texts.form.title), 'Barbero de planta');
    await fireEvent.changeText(screen.getByLabelText(texts.offers.payMin), '1500');
    await fireEvent.changeText(screen.getByLabelText(texts.offers.payMax), '1800');
    await fireEvent.press(screen.getByRole('button', { name: texts.offers.send }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    expect(api.calls.find((c) => c.method === 'POST')!.body).toMatchObject({
      barberProfileId: 'bp1',
      title: 'Barbero de planta',
      payMin: 150000,
      payMax: 180000,
      payPeriod: 'MONTH',
      expiresInDays: 7,
    });
  });
});
