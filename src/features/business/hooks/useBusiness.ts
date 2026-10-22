import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Share } from 'react-native';
import { isApiError, newIdempotencyKey } from '@/shared/api';
import { i18n } from '@/shared/i18n';
import { parseSoles } from '@/shared/lib';
import { showToast, translateErrorMessage } from '@/shared/ui';
import {
  businessKeys,
  closeCash,
  createClient,
  createSale,
  fetchCash,
  fetchCashHistory,
  fetchCatalog,
  fetchCatalogSources,
  fetchClient,
  fetchClientRanking,
  fetchClients,
  fetchInvoicing,
  fetchSale,
  fetchSales,
  fetchSalesCsv,
  fetchSalesReport,
  importCatalogItem,
  openCash,
  recomputeClientRanking,
  retryInvoice,
  saveInvoicing,
  setBarberCommission,
  updateClient,
  voidSale,
  type CashSession,
  type ClientFilters,
  type CustomerDoc,
  type InvoicingInput,
  type PaymentMethod,
  type Sale,
  type SaleLineInput,
} from '../api/businessApi';

export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'YAPE', 'CARD', 'TRANSFER', 'MEMBERSHIP_CREDIT'];

/** Receipts from this amount need the buyer's document (backend rule, shown in advance). */
export const INVOICE_DOC_FROM_CENTS = 70000;

// --- Cash register

/** Today's register: open (with its numbers) or closed (null). */
export function useCash(shopId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: businessKeys.cash(shopId),
    queryFn: async (): Promise<CashSession | null> => {
      try {
        return await fetchCash(shopId);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 0,
  });
  const history = useQuery({
    queryKey: businessKeys.cashHistory(shopId),
    queryFn: () => fetchCashHistory(shopId),
  });
  const [error, setError] = useState<string | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: businessKeys.all(shopId) });
  const open = useMutation({
    mutationFn: (amount: number) => openCash(shopId, amount),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('business:cash.opened'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const close = useMutation({
    mutationFn: ({ counted, note }: { counted: number; note?: string }) => closeCash(shopId, counted, note),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('business:cash.closed'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    query,
    history,
    error,
    open: (soles: string) => {
      const cents = parseSoles(soles);
      if (cents === null) return setError(i18n.t('business:amountInvalid'));
      setError(null);
      open.mutate(cents);
    },
    isOpening: open.isPending,
    close: (soles: string, note?: string) => {
      const cents = parseSoles(soles);
      if (cents === null) return setError(i18n.t('business:amountInvalid'));
      setError(null);
      close.mutate({ counted: cents, note });
    },
    isClosing: close.isPending,
    /** What the last close left (expected vs counted), to show after closing. */
    lastClosed: close.data ?? null,
  };
}

// --- New sale

export interface DraftLine {
  key: string;
  serviceId?: string;
  name: string;
  /** Céntimos; only for free lines (services take their price from the backend). */
  unitAmount?: number;
  quantity: number;
}

/**
 * "Nueva venta": what was done (services or free lines), who and how it was paid. The total is
 * computed by the backend and shown on the receipt; the app only sends what was chosen.
 */
export function useNewSale(shopId: string, { onDone }: { onDone: (sale: Sale) => void }) {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [discount, setDiscount] = useState('');
  const [invoice, setInvoice] = useState(false);
  const [customer, setCustomer] = useState<CustomerDoc>({ type: 'NONE' });
  const [error, setError] = useState<string | null>(null);
  const [needsCash, setNeedsCash] = useState(false);
  // One key per attempt; a retry of the same attempt reuses it.
  const attempt = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      attempt.current ??= newIdempotencyKey();
      const discountCents = discount.trim() ? parseSoles(discount) : 0;
      const body = {
        lines: lines.map((l): SaleLineInput =>
          l.serviceId
            ? { serviceId: l.serviceId, quantity: l.quantity }
            : { description: l.name, unitAmount: l.unitAmount, quantity: l.quantity },
        ),
        paymentMethod: method,
        ...(clientId ? { shopClientId: clientId } : {}),
        ...(barberId ? { barberId } : {}),
        discountAmount: discountCents ?? 0,
        issueInvoice: invoice,
        ...(invoice ? { customer } : {}),
      };
      return createSale(shopId, body, attempt.current);
    },
    onSuccess: (sale) => {
      attempt.current = null;
      void queryClient.invalidateQueries({ queryKey: businessKeys.all(shopId) });
      onDone(sale);
    },
    onError: (err) => {
      if (isApiError(err) && err.status < 500 && err.code !== 'TOO_MANY_REQUESTS') attempt.current = null;
      if (isApiError(err) && err.code === 'CASH_SESSION_REQUIRED') setNeedsCash(true);
      setError(translateErrorMessage(err));
    },
  });

  const newAttempt = () => {
    attempt.current = null;
    setError(null);
  };
  return {
    lines,
    addService: (serviceId: string, name: string) => {
      newAttempt();
      setLines((current) => {
        const existing = current.find((l) => l.serviceId === serviceId);
        return existing
          ? current.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
          : [...current, { key: serviceId, serviceId, name, quantity: 1 }];
      });
    },
    addFreeLine: (name: string, soles: string) => {
      const cents = parseSoles(soles);
      if (!name.trim() || cents === null) return setError(i18n.t('business:sale.freeLineInvalid'));
      newAttempt();
      setLines((current) => [
        ...current,
        { key: `${Date.now()}`, name: name.trim(), unitAmount: cents, quantity: 1 },
      ]);
    },
    removeLine: (key: string) => {
      newAttempt();
      setLines((current) => current.filter((l) => l.key !== key));
    },
    clientId,
    setClientId: (id: string | null) => {
      newAttempt();
      setClientId(id);
    },
    barberId,
    setBarberId: (id: string | null) => {
      newAttempt();
      setBarberId(id);
    },
    method,
    setMethod: (m: PaymentMethod) => {
      newAttempt();
      setNeedsCash(false);
      setMethod(m);
    },
    discount,
    setDiscount: (v: string) => {
      newAttempt();
      setDiscount(v);
    },
    invoice,
    setInvoice: (v: boolean) => {
      newAttempt();
      setInvoice(v);
    },
    customer,
    setCustomer: (c: CustomerDoc) => {
      newAttempt();
      setCustomer(c);
    },
    canSubmit: lines.length > 0 && !mutation.isPending,
    submit: () => mutation.mutate(),
    isSubmitting: mutation.isPending,
    error,
    /** Cash without an open register: offer to open it. */
    needsCash,
  };
}

// --- Sales

export function useSales(shopId: string, from: string, to: string) {
  return useQuery({
    queryKey: businessKeys.sales(shopId, from, to),
    queryFn: () => fetchSales(shopId, from, to),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useSale(shopId: string, saleId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: businessKeys.sale(shopId, saleId),
    queryFn: () => fetchSale(shopId, saleId),
  });
  const [error, setError] = useState<string | null>(null);
  const update = (sale: Sale) => {
    queryClient.setQueryData(businessKeys.sale(shopId, saleId), sale);
    void queryClient.invalidateQueries({ queryKey: businessKeys.all(shopId) });
  };
  const voiding = useMutation({
    mutationFn: (reason: string) => voidSale(shopId, saleId, reason),
    onSuccess: (sale) => {
      update(sale);
      showToast(i18n.t('business:sale.voided'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const retry = useMutation({
    mutationFn: () => retryInvoice(shopId, saleId),
    onSuccess: update,
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    query,
    error,
    void: (reason: string) => voiding.mutate(reason),
    isVoiding: voiding.isPending,
    retryInvoice: () => retry.mutate(),
    isRetrying: retry.isPending,
  };
}

// --- Receipts (owner)

export function useInvoicing(shopId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: businessKeys.invoicing(shopId), queryFn: () => fetchInvoicing(shopId) });
  const mutation = useMutation({
    mutationFn: (body: InvoicingInput) => saveInvoicing(shopId, body),
    onSuccess: (config) => {
      queryClient.setQueryData(businessKeys.invoicing(shopId), config);
      showToast(i18n.t('business:invoicing.saved'));
    },
  });
  return {
    query,
    save: (body: InvoicingInput) => mutation.mutate(body),
    isSaving: mutation.isPending,
    error: mutation.error ? translateErrorMessage(mutation.error) : null,
  };
}

// --- Clients

export function useClients(shopId: string, filters: ClientFilters) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: businessKeys.clients(shopId, filters),
    queryFn: () => fetchClients(shopId, filters),
    placeholderData: keepPreviousData,
  });
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: (input: { displayName?: string; username?: string; phone?: string }) =>
      createClient(shopId, { ...input, isRegular: false }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessKeys.all(shopId) });
      showToast(i18n.t('business:clients.created'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    query,
    error,
    create: (input: { displayName?: string; username?: string; phone?: string }, onDone: () => void) => {
      setError(null);
      create.mutate(input, { onSuccess: onDone });
    },
    isCreating: create.isPending,
  };
}

export function useClient(shopId: string, clientId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: businessKeys.client(shopId, clientId),
    queryFn: () => fetchClient(shopId, clientId),
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof updateClient>[2]) => updateClient(shopId, clientId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessKeys.all(shopId) });
      showToast(i18n.t('business:clients.saved'));
    },
  });
  return {
    query,
    save: (body: Parameters<typeof updateClient>[2]) => mutation.mutate(body),
    isSaving: mutation.isPending,
    error: mutation.error ? translateErrorMessage(mutation.error) : null,
  };
}

export function useClientRanking(shopId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: businessKeys.ranking(shopId),
    queryFn: () => fetchClientRanking(shopId),
  });
  const recompute = useMutation({
    mutationFn: () => recomputeClientRanking(shopId),
    onSuccess: (ranking) => queryClient.setQueryData(businessKeys.ranking(shopId), ranking),
  });
  return { query, recompute: () => recompute.mutate(), isRecomputing: recompute.isPending };
}

// --- Catalog

export function useCatalog(shopId: string) {
  const queryClient = useQueryClient();
  const items = useQuery({ queryKey: businessKeys.catalog(shopId), queryFn: () => fetchCatalog(shopId) });
  const sources = useQuery({
    queryKey: businessKeys.sources(shopId),
    queryFn: () => fetchCatalogSources(shopId),
  });
  const [error, setError] = useState<string | null>(null);
  const importItem = useMutation({
    mutationFn: (input: { imageId: string; name?: string; priceAmount: number; durationMinutes: number }) =>
      importCatalogItem(shopId, input),
    onSuccess: (catalog) => {
      queryClient.setQueryData(businessKeys.catalog(shopId), catalog);
      void queryClient.invalidateQueries({ queryKey: ['barbershop'] });
      void queryClient.invalidateQueries({ queryKey: ['shop-management'] });
      showToast(i18n.t('business:catalog.imported'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    items,
    sources,
    error,
    importItem: (
      input: { imageId: string; name: string; price: string; duration: string },
      onDone: () => void,
    ) => {
      const cents = parseSoles(input.price);
      const minutes = Number(input.duration);
      if (cents === null || !Number.isInteger(minutes) || minutes < 5) {
        setError(i18n.t('business:catalog.invalid'));
        return;
      }
      setError(null);
      importItem.mutate(
        {
          imageId: input.imageId,
          priceAmount: cents,
          durationMinutes: minutes,
          ...(input.name.trim() ? { name: input.name.trim() } : {}),
        },
        { onSuccess: onDone },
      );
    },
    isImporting: importItem.isPending,
  };
}

// --- Reports

export function useSalesReport(shopId: string, from: string, to: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: businessKeys.report(shopId, from, to),
    queryFn: () => fetchSalesReport(shopId, from, to),
    placeholderData: keepPreviousData,
  });
  const [error, setError] = useState<string | null>(null);
  const csv = useMutation({
    mutationFn: () => fetchSalesCsv(shopId, from, to),
    onSuccess: (text) => void Share.share({ title: i18n.t('business:reports.csvTitle'), message: text }),
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const commission = useMutation({
    mutationFn: ({ barberId, percent }: { barberId: string; percent: number }) =>
      setBarberCommission(shopId, barberId, Math.round(percent * 100)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessKeys.all(shopId) });
      showToast(i18n.t('business:reports.commissionSaved'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    query,
    error,
    shareCsv: () => {
      setError(null);
      csv.mutate();
    },
    isSharing: csv.isPending,
    setCommission: (barberId: string, percent: number) => commission.mutate({ barberId, percent }),
  };
}
