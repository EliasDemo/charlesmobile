import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type CashSession = S['CashSessionDto'];
export type Sale = S['SaleDto'];
export type SaleInput = S['CreateSaleDto'];
export type SaleLineInput = S['SaleLineInputDto'];
export type PaymentMethod = Sale['paymentMethod'];
export type Invoice = S['InvoiceDto'];
export type InvoicingConfig = S['InvoicingConfigDto'];
export type InvoicingInput = S['UpdateInvoicingConfigDto'];
export type ShopClient = S['ShopClientDto'];
export type ShopClientDetail = S['ShopClientDetailDto'];
export type ClientTier = ShopClient['tier'];
export type ClientRanking = S['RankingDto'];
export type CatalogItem = S['CatalogItemDto'];
export type CatalogSource = S['CatalogSourceDto'];
export type SalesReport = S['SalesReportDto'];
export type CustomerDoc = S['CustomerDocDto'];

export const businessKeys = {
  all: (id: string) => ['business', id] as const,
  cash: (id: string) => ['business', id, 'cash'] as const,
  cashHistory: (id: string) => ['business', id, 'cash', 'history'] as const,
  sales: (id: string, from: string, to: string) => ['business', id, 'sales', from, to] as const,
  sale: (id: string, saleId: string) => ['business', id, 'sale', saleId] as const,
  invoicing: (id: string) => ['business', id, 'invoicing'] as const,
  clients: (id: string, filters: object) => ['business', id, 'clients', filters] as const,
  client: (id: string, clientId: string) => ['business', id, 'client', clientId] as const,
  ranking: (id: string) => ['business', id, 'ranking'] as const,
  catalog: (id: string) => ['business', id, 'catalog'] as const,
  sources: (id: string) => ['business', id, 'catalog', 'sources'] as const,
  report: (id: string, from: string, to: string) => ['business', id, 'report', from, to] as const,
  balance: (id: string) => ['business', id, 'balance'] as const,
  statement: (id: string, from: string, to: string) => ['business', id, 'statement', from, to] as const,
  seller: (id: string) => ['business', id, 'seller'] as const,
};

const p = (id: string) => ({ params: { path: { id } } });

// Cash register

/** The open session, or 404 when the register is closed. */
export const fetchCash = (id: string): Promise<CashSession> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/cash', p(id)));
export const fetchCashHistory = (id: string): Promise<CashSession[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/cash/history', p(id)));
export const openCash = (id: string, openingAmount: number): Promise<CashSession> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/cash/open', { ...p(id), body: { openingAmount } }));
export const closeCash = (id: string, countedAmount: number, note?: string): Promise<CashSession> =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/cash/close', {
      ...p(id),
      body: { countedAmount, ...(note?.trim() ? { note: note.trim() } : {}) },
    }),
  );

// Sales

/** One Idempotency-Key per attempt, reused if the same attempt is retried. */
export const createSale = (id: string, body: SaleInput, idempotencyKey: string): Promise<Sale> =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/sales', {
      params: { path: { id }, header: { 'Idempotency-Key': idempotencyKey } },
      body,
    }),
  );
export const fetchSales = (id: string, from: string, to: string): Promise<Sale[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/sales', { params: { path: { id }, query: { from, to } } }));
export const fetchSale = (id: string, saleId: string): Promise<Sale> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/sales/{saleId}', { params: { path: { id, saleId } } }));
export const voidSale = (id: string, saleId: string, reason: string): Promise<Sale> =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/sales/{saleId}/void', {
      params: { path: { id, saleId } },
      body: { reason },
    }),
  );
export const retryInvoice = (id: string, saleId: string): Promise<Sale> =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/sales/{saleId}/invoice/retry', { params: { path: { id, saleId } } }),
  );

// Receipts (OWNER)

export const fetchInvoicing = (id: string): Promise<InvoicingConfig> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/invoicing', p(id)));
/** The token goes straight to the backend; the app never keeps it. */
export const saveInvoicing = (id: string, body: InvoicingInput): Promise<InvoicingConfig> =>
  unwrap(api.PUT('/api/v1/barbershops/{id}/invoicing', { ...p(id), body }));

// Clients

export type ClientFilters = { q?: string; tier?: ClientTier; regular?: boolean };

export const fetchClients = (id: string, filters: ClientFilters): Promise<ShopClient[]> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/clients', {
      params: {
        path: { id },
        query: {
          ...(filters.q?.trim() ? { q: filters.q.trim() } : {}),
          ...(filters.tier ? { tier: filters.tier } : {}),
          ...(filters.regular ? { regular: true } : {}),
        },
      },
    }),
  );
export const createClient = (id: string, body: S['CreateShopClientDto']): Promise<ShopClient> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/clients', { ...p(id), body }));
export const fetchClient = (id: string, clientId: string): Promise<ShopClientDetail> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/clients/{clientId}', { params: { path: { id, clientId } } }));
export const updateClient = (id: string, clientId: string, body: S['UpdateShopClientDto']) =>
  unwrap(
    api.PATCH('/api/v1/barbershops/{id}/clients/{clientId}', { params: { path: { id, clientId } }, body }),
  );
export const fetchClientRanking = (id: string): Promise<ClientRanking> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/clients/ranking', p(id)));
export const recomputeClientRanking = (id: string): Promise<ClientRanking> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/clients/ranking/recompute', p(id)));

// Catalog

export const fetchCatalog = (id: string): Promise<CatalogItem[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/catalog', p(id)));
export const fetchCatalogSources = (id: string): Promise<CatalogSource[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/catalog/sources', p(id)));
export const importCatalogItem = (id: string, body: S['ImportCatalogItemDto']): Promise<CatalogItem[]> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/catalog/import', { ...p(id), body }));

// Reports

/** From and to as YYYY-MM-DD (up to 366 days). */
export const fetchSalesReport = (id: string, from: string, to: string): Promise<SalesReport> =>
  unwrap(
    api.GET('/api/v1/barbershops/{id}/reports/sales', { params: { path: { id }, query: { from, to } } }),
  );

/** The CSV as text, to share (only if the plan allows it). */
export const fetchSalesCsv = async (id: string, from: string, to: string): Promise<string> => {
  const { data, error, response } = await api.GET('/api/v1/barbershops/{id}/reports/sales.csv', {
    params: { path: { id }, query: { from, to } },
    parseAs: 'text',
  });
  if (!response.ok || typeof data !== 'string') {
    // Same error handling as every call.
    return unwrap(Promise.resolve({ data: undefined, error, response }) as never);
  }
  return data;
};

/** Basis points: 1000 = 10 %. */
export const setBarberCommission = (id: string, barberId: string, commissionBp: number) =>
  unwrap(
    api.PUT('/api/v1/barbershops/{id}/barbers/{barberId}/commission', {
      params: { path: { id, barberId } },
      body: { commissionBp },
    }),
  );

// Money: balance in favor, statement and the Mercado Pago account for direct payments.
export type Balance = S['BalanceDto'];
export type Statement = S['StatementDto'];
export type StatementLine = S['StatementLineDto'];
export type SellerAccount = S['SellerAccountDto'];

export const fetchBalance = (id: string): Promise<Balance> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/balance', p(id)));
export const fetchStatement = (id: string, from: string, to: string): Promise<Statement> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/statement', { params: { path: { id }, query: { from, to } } }));
export const fetchSellerAccount = (id: string): Promise<SellerAccount> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/seller-account', p(id)));
export const connectSeller = (id: string) =>
  unwrap(api.POST('/api/v1/barbershops/{id}/seller-account/connect', p(id)));
export const disconnectSeller = (id: string) =>
  unwrap(api.DELETE('/api/v1/barbershops/{id}/seller-account', p(id)));
