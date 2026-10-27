import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { env } from '@/shared/config';
import { i18n } from '@/shared/i18n';
import { daysAround } from '@/shared/lib';
import { showToast, translateErrorMessage } from '@/shared/ui';
import {
  businessKeys,
  connectSeller,
  disconnectSeller,
  fetchBalance,
  fetchSellerAccount,
  fetchStatement,
} from '../api/businessApi';

export const STATEMENT_RANGES = [7, 30, 90, 365] as const;
export type StatementRange = (typeof STATEMENT_RANGES)[number];

/** "Mi dinero": balance, then the statement of the chosen period (the backend adds it up). */
export function useMoney(shopId: string) {
  const [range, setRange] = useState<StatementRange>(30);
  const days = daysAround(env.defaultTimeZone, range - 1, 0);
  const from = days[0]!.date;
  const today = days[days.length - 1]!.date;
  const balance = useQuery({ queryKey: businessKeys.balance(shopId), queryFn: () => fetchBalance(shopId) });
  const statement = useQuery({
    queryKey: businessKeys.statement(shopId, from, today),
    queryFn: () => fetchStatement(shopId, from, today),
  });
  return { range, setRange, balance, statement };
}

/**
 * "Cobrar directo con Mercado Pago" (only the owner connects or disconnects; the backend says it).
 * Authorizing happens in the external browser; coming back to the app asks for the state again.
 */
export function useSellerAccount(shopId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: businessKeys.seller(shopId),
    queryFn: () => fetchSellerAccount(shopId),
  });
  const [error, setError] = useState<string | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: businessKeys.seller(shopId) });
    void queryClient.invalidateQueries({ queryKey: businessKeys.balance(shopId) });
  };
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);
  const connect = useMutation({
    mutationFn: () => connectSeller(shopId),
    onSuccess: async ({ authorizationUrl }) => {
      await Linking.openURL(authorizationUrl);
      refresh();
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  const disconnect = useMutation({
    mutationFn: () => disconnectSeller(shopId),
    onSuccess: () => {
      refresh();
      showToast(i18n.t('business:seller.disconnected'));
    },
    onError: (err) => setError(translateErrorMessage(err)),
  });
  return {
    query,
    error,
    connect: () => {
      setError(null);
      connect.mutate();
    },
    disconnect: () => {
      setError(null);
      disconnect.mutate();
    },
    isConnecting: connect.isPending,
    isDisconnecting: disconnect.isPending,
  };
}
