import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useServicesQuery } from '@/features/barbershop';
import { useBarbersList } from '@/features/shop-management';
import { mediaUrl } from '@/shared/api';
import { env } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate, formatTime, useDebouncedValue } from '@/shared/lib';
import { sizes, spacing, useTheme } from '@/shared/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  InfoCard,
  ListRow,
  Monogram,
  Notice,
  QueryView,
  Screen,
  SearchField,
  SwitchRow,
  Text,
  TextField,
} from '@/shared/ui';
import type { ClientTier, CustomerDoc, Sale } from '../api/businessApi';
import {
  DayBars,
  InvoicePill,
  PEN,
  RangeChips,
  Stat,
  StatRow,
  TierPill,
  rangeFor,
  type RangeKey,
} from '../components/BusinessParts';
import {
  INVOICE_DOC_FROM_CENTS,
  PAYMENT_METHODS,
  useCash,
  useCatalog,
  useClient,
  useClientRanking,
  useClients,
  useInvoicing,
  useNewSale,
  useSale,
  useSales,
  useSalesReport,
} from '../hooks/useBusiness';

const zone = env.defaultTimeZone;

// --------------------------------------------------------------------------- Cash register

/** "Caja": open it with the starting amount, see the day, and close it counting the money. */
export function CashScreen({ shopId, onNewSale }: { shopId: string; onNewSale: () => void }) {
  const { t } = useTranslation('business');
  const c = useCash(shopId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  return (
    <Screen refreshing={c.query.isRefetching} onRefresh={() => void c.query.refetch()}>
      {c.error ? <Notice tone="danger" message={c.error} /> : null}
      {c.lastClosed ? (
        <Notice
          tone={c.lastClosed.difference === 0 ? 'success' : 'warning'}
          message={t('cash.closedSummary', {
            expected: PEN(c.lastClosed.expectedAmount ?? 0),
            counted: PEN(c.lastClosed.countedAmount ?? 0),
            difference: PEN(c.lastClosed.difference ?? 0),
          })}
        />
      ) : null}
      <QueryView query={c.query}>
        {(session) =>
          session ? (
            <View style={styles.content}>
              <Badge label={t('cash.isOpen', { time: formatTime(session.openedAt, zone) })} tone="success" />
              <StatRow>
                <Stat label={t('cash.opening')} value={PEN(session.openingAmount)} />
                <Stat
                  label={t('cash.sales', { count: session.salesCount })}
                  value={PEN(session.salesTotal)}
                  tone="success"
                />
                <Stat label={t('cash.expected')} value={PEN(session.expectedAmount ?? 0)} tone="primary" />
              </StatRow>
              <Button label={t('sale.new')} icon="add-circle" onPress={onNewSale} fullWidth />
              <Card>
                <Text variant="subtitle">{t('cash.closeTitle')}</Text>
                <TextField
                  label={t('cash.counted')}
                  hint={t('cash.countedHint')}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  maxLength={10}
                />
                <TextField label={t('cash.note')} value={note} onChangeText={setNote} maxLength={200} />
                <Button
                  label={t('cash.close')}
                  variant="secondary"
                  onPress={() => c.close(amount, note)}
                  loading={c.isClosing}
                  disabled={!amount.trim()}
                />
              </Card>
            </View>
          ) : (
            <Card>
              <Text variant="subtitle">{t('cash.closedTitle')}</Text>
              <Text color="textSecondary">{t('cash.closedMessage')}</Text>
              <TextField
                label={t('cash.openingAmount')}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                maxLength={10}
              />
              <Button label={t('cash.open')} onPress={() => c.open(amount || '0')} loading={c.isOpening} />
            </Card>
          )
        }
      </QueryView>
      <Text variant="subtitle">{t('cash.history')}</Text>
      <QueryView query={c.history} isEmpty={(h) => h.length === 0} empty={{ title: t('cash.noHistory') }}>
        {(sessions) => (
          <View style={styles.list}>
            {sessions.map((s) => (
              <ListRow
                key={s.id}
                icon="cash"
                title={formatShortDate(s.openedAt, zone)}
                value={t('cash.historyLine', {
                  total: PEN(s.salesTotal),
                  difference: PEN(s.difference ?? 0),
                })}
              />
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

// --------------------------------------------------------------------------- New sale

/** "Nueva venta": what was done, by whom, for whom and how it was paid; the backend totals it. */
export function NewSaleScreen({
  shopId,
  onDone,
  onOpenCash,
}: {
  shopId: string;
  onDone: (sale: Sale) => void;
  onOpenCash: () => void;
}) {
  const { t } = useTranslation('business');
  const theme = useTheme();
  const s = useNewSale(shopId, { onDone });
  const services = useServicesQuery(shopId);
  const barbers = useBarbersList(shopId);
  const [clientQ, setClientQ] = useState('');
  const clients = useClients(shopId, { q: useDebouncedValue(clientQ, 300) });
  const [freeName, setFreeName] = useState('');
  const [freePrice, setFreePrice] = useState('');
  const chosenClient = clients.query.data?.find((c) => c.id === s.clientId);
  return (
    <Screen>
      <Text variant="subtitle">{t('sale.what')}</Text>
      <View style={styles.chips}>
        {(services.data ?? []).map((svc) => (
          <Chip
            key={svc.id}
            label={`${svc.name} · ${PEN(svc.price.amount)}`}
            onPress={() => s.addService(svc.id, svc.name)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label={t('sale.freeName')} value={freeName} onChangeText={setFreeName} maxLength={80} />
        </View>
        <View style={styles.price}>
          <TextField
            label={t('sale.freePrice')}
            value={freePrice}
            onChangeText={setFreePrice}
            keyboardType="decimal-pad"
            maxLength={8}
          />
        </View>
      </View>
      <Button
        label={t('sale.addFree')}
        variant="ghost"
        icon="add"
        onPress={() => {
          s.addFreeLine(freeName, freePrice);
          setFreeName('');
          setFreePrice('');
        }}
      />
      {s.lines.length > 0 ? (
        <Card>
          {s.lines.map((line) => (
            <View key={line.key} style={styles.row}>
              <Text style={styles.flex}>{`${line.quantity} × ${line.name}`}</Text>
              {line.unitAmount !== undefined ? <Text>{PEN(line.unitAmount)}</Text> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('sale.removeLine', { name: line.name })}
                onPress={() => s.removeLine(line.key)}
                style={styles.remove}
              >
                <Text color="danger">✕</Text>
              </Pressable>
            </View>
          ))}
          <Text variant="caption" color="textMuted">
            {t('sale.totalNote')}
          </Text>
        </Card>
      ) : (
        <Text color="textMuted">{t('sale.noLines')}</Text>
      )}

      <Text variant="subtitle">{t('sale.barber')}</Text>
      <View style={styles.chips}>
        <Chip label={t('sale.noBarber')} selected={!s.barberId} onPress={() => s.setBarberId(null)} />
        {(barbers.data ?? [])
          .filter((b) => b.isActive)
          .map((b) => (
            <Chip
              key={b.id}
              label={b.displayName}
              selected={s.barberId === b.id}
              onPress={() => s.setBarberId(b.id)}
            />
          ))}
      </View>

      <Text variant="subtitle">{t('sale.client')}</Text>
      {chosenClient ? (
        <ListRow
          icon="person"
          title={chosenClient.displayName}
          value={t('sale.change')}
          onPress={() => s.setClientId(null)}
        />
      ) : (
        <>
          <SearchField
            label={t('sale.searchClient')}
            value={clientQ}
            onChangeText={setClientQ}
            placeholder={t('sale.searchClient')}
          />
          {clientQ.trim()
            ? (clients.query.data ?? [])
                .slice(0, 5)
                .map((c) => (
                  <ListRow
                    key={c.id}
                    icon="person"
                    title={c.displayName}
                    value={c.username ? `@${c.username}` : undefined}
                    onPress={() => s.setClientId(c.id)}
                  />
                ))
            : null}
        </>
      )}

      <Text variant="subtitle">{t('sale.method')}</Text>
      <View style={styles.chips}>
        {PAYMENT_METHODS.filter((m) => m !== 'MEMBERSHIP_CREDIT').map((m) => (
          <Chip key={m} label={t(`methods.${m}`)} selected={s.method === m} onPress={() => s.setMethod(m)} />
        ))}
      </View>
      <TextField
        label={t('sale.discount')}
        value={s.discount}
        onChangeText={s.setDiscount}
        keyboardType="decimal-pad"
        maxLength={8}
      />

      <SwitchRow
        title={t('sale.invoice')}
        subtitle={t('sale.invoiceHint')}
        value={s.invoice}
        onValueChange={s.setInvoice}
      />
      {s.invoice ? <CustomerFields value={s.customer} onChange={s.setCustomer} /> : null}

      {s.needsCash ? (
        <Notice tone="warning" message={t('sale.needsCash')}>
          <Button label={t('cash.open')} variant="secondary" onPress={onOpenCash} />
        </Notice>
      ) : s.error ? (
        <Notice tone="danger" message={s.error} />
      ) : null}
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button
          label={t('sale.register')}
          icon="checkmark-circle"
          onPress={s.submit}
          loading={s.isSubmitting}
          disabled={!s.canSubmit}
          fullWidth
        />
      </View>
    </Screen>
  );
}

function CustomerFields({ value, onChange }: { value: CustomerDoc; onChange: (doc: CustomerDoc) => void }) {
  const { t } = useTranslation('business');
  return (
    <Card>
      <Text variant="caption" color="textSecondary">
        {t('sale.docRule', { amount: PEN(INVOICE_DOC_FROM_CENTS) })}
      </Text>
      <View style={styles.chips}>
        {(['NONE', 'DNI', 'CE', 'RUC'] as const).map((type) => (
          <Chip
            key={type}
            label={t(`docs.${type}`)}
            selected={value.type === type}
            onPress={() => onChange({ ...value, type })}
          />
        ))}
      </View>
      {value.type !== 'NONE' ? (
        <>
          <TextField
            label={t('sale.docNumber')}
            value={value.number ?? ''}
            onChangeText={(number) => onChange({ ...value, number: number.replace(/\D/g, '') })}
            keyboardType="number-pad"
            maxLength={value.type === 'DNI' ? 8 : value.type === 'RUC' ? 11 : 12}
          />
          <TextField
            label={t('sale.docName')}
            value={value.name ?? ''}
            onChangeText={(name) => onChange({ ...value, name })}
            maxLength={100}
          />
        </>
      ) : null}
    </Card>
  );
}

// --------------------------------------------------------------------------- Sales

export function SalesScreen({
  shopId,
  onOpen,
  onNew,
}: {
  shopId: string;
  onOpen: (saleId: string) => void;
  onNew: () => void;
}) {
  const { t } = useTranslation('business');
  const [range, setRange] = useState<RangeKey>('today');
  const { from, to } = rangeFor(range);
  const sales = useSales(shopId, from, to);
  return (
    <Screen refreshing={sales.isRefetching} onRefresh={() => void sales.refetch()}>
      <Button label={t('sale.new')} icon="add-circle" onPress={onNew} fullWidth />
      <RangeChips value={range} onChange={setRange} />
      <QueryView
        query={sales}
        isEmpty={(items) => items.length === 0}
        empty={{
          title: t('sales.empty'),
          icon: 'receipt-outline',
          action: { label: t('sale.new'), onPress: onNew },
        }}
      >
        {(items) => (
          <View style={styles.list}>
            {items.map((sale) => (
              <InfoCard
                key={sale.id}
                testID={`sale-${sale.id}`}
                onPress={() => onOpen(sale.id)}
                title={PEN(sale.totalAmount)}
                subtitle={sale.lines.map((l) => l.description).join(', ')}
                details={[
                  {
                    icon: 'time',
                    text: `${formatShortDate(sale.soldAt, zone)} · ${formatTime(sale.soldAt, zone)}`,
                  },
                  { icon: 'wallet', text: t(`methods.${sale.paymentMethod}`) },
                  ...(sale.barberName ? [{ icon: 'cut' as const, text: sale.barberName }] : []),
                ]}
                trailing={
                  sale.status === 'VOIDED' ? <Badge label={t('sales.voided')} tone="danger" /> : undefined
                }
              />
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

export function SaleScreen({ shopId, saleId }: { shopId: string; saleId: string }) {
  const { t } = useTranslation('business');
  const s = useSale(shopId, saleId);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <Screen>
      {s.error ? <Notice tone="danger" message={s.error} /> : null}
      <QueryView query={s.query}>
        {(sale) => {
          const invoice = sale.invoice as {
            number: string | null;
            status: Parameters<typeof InvoicePill>[0]['status'];
            pdfUrl: string | null;
            lastError: string | null;
          } | null;
          return (
            <View style={styles.content}>
              <Card>
                <Text variant="hero" color={sale.status === 'VOIDED' ? 'textMuted' : 'primary'}>
                  {PEN(sale.totalAmount)}
                </Text>
                <Text color="textSecondary">{`${formatShortDate(sale.soldAt, zone)} · ${formatTime(sale.soldAt, zone)}`}</Text>
                {sale.status === 'VOIDED' ? (
                  <Notice
                    tone="danger"
                    message={t('sales.voidedReason', { reason: sale.voidReason ?? '' })}
                  />
                ) : null}
              </Card>
              <Card>
                {sale.lines.map((line, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={styles.flex}>{`${line.quantity} × ${line.description}`}</Text>
                    <Text>{PEN(line.totalAmount)}</Text>
                  </View>
                ))}
                {sale.discountAmount > 0 ? (
                  <View style={styles.row}>
                    <Text color="success" style={styles.flex}>
                      {t('sale.discountLine')}
                    </Text>
                    <Text color="success">{`− ${PEN(sale.discountAmount)}`}</Text>
                  </View>
                ) : null}
                <View style={styles.row}>
                  <Text variant="bodyStrong" style={styles.flex}>
                    {t('sale.total')}
                  </Text>
                  <Text variant="bodyStrong">{PEN(sale.totalAmount)}</Text>
                </View>
              </Card>
              <ListRow icon="wallet" title={t('sale.method')} value={t(`methods.${sale.paymentMethod}`)} />
              {sale.barberName ? (
                <ListRow icon="cut" title={t('sale.barber')} value={sale.barberName} />
              ) : null}
              {sale.clientName ? (
                <ListRow icon="person" title={t('sale.client')} value={sale.clientName} />
              ) : null}
              {invoice ? (
                <Card>
                  <View style={styles.row}>
                    <Text variant="subtitle" style={styles.flex}>
                      {invoice.number ?? t('invoice.title')}
                    </Text>
                    <InvoicePill status={invoice.status} />
                  </View>
                  {invoice.lastError ? <Text color="danger">{invoice.lastError}</Text> : null}
                  {invoice.pdfUrl ? (
                    <Button
                      label={t('invoice.pdf')}
                      variant="secondary"
                      icon="document"
                      onPress={() => void Linking.openURL(mediaUrl(invoice.pdfUrl) ?? invoice.pdfUrl!)}
                    />
                  ) : null}
                  {invoice.status === 'FAILED' || invoice.status === 'REJECTED' ? (
                    <Button
                      label={t('invoice.retry')}
                      variant="secondary"
                      icon="refresh"
                      onPress={s.retryInvoice}
                      loading={s.isRetrying}
                    />
                  ) : null}
                </Card>
              ) : null}
              {sale.status === 'COMPLETED' ? (
                <Button label={t('sales.void')} variant="ghost" onPress={() => setVoiding(true)} />
              ) : null}
            </View>
          );
        }}
      </QueryView>
      <ConfirmDialog
        visible={voiding}
        title={t('sales.voidTitle')}
        message={t('sales.voidMessage')}
        confirmLabel={t('sales.void')}
        destructive
        loading={s.isVoiding}
        confirmDisabled={reason.trim().length < 3}
        onConfirm={() => {
          s.void(reason.trim());
          setVoiding(false);
        }}
        onCancel={() => setVoiding(false)}
      >
        <TextField label={t('sales.voidReason')} value={reason} onChangeText={setReason} maxLength={200} />
      </ConfirmDialog>
    </Screen>
  );
}

// --------------------------------------------------------------------------- Clients

const TIERS: ClientTier[] = ['GOLD', 'SILVER', 'BRONZE'];

export function ClientsScreen({ shopId, onOpen }: { shopId: string; onOpen: (clientId: string) => void }) {
  const { t } = useTranslation('business');
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<ClientTier | undefined>(undefined);
  const [regular, setRegular] = useState(false);
  const c = useClients(shopId, { q: useDebouncedValue(q, 300), tier, regular });
  const ranking = useClientRanking(shopId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  return (
    <Screen>
      <QueryView query={ranking.query}>
        {(r) => (
          <StatRow>
            {TIERS.map((k) => (
              <Stat
                key={k}
                label={t(`tiers.${k}`)}
                value={String(r.tiers.find((x) => x.tier === k)?.count ?? 0)}
              />
            ))}
          </StatRow>
        )}
      </QueryView>
      <Button
        label={t('clients.recompute')}
        variant="ghost"
        icon="refresh"
        onPress={ranking.recompute}
        loading={ranking.isRecomputing}
      />
      <SearchField
        label={t('clients.search')}
        value={q}
        onChangeText={setQ}
        placeholder={t('clients.search')}
      />
      <View style={styles.chips}>
        <Chip
          label={t('clients.all')}
          selected={!tier && !regular}
          onPress={() => {
            setTier(undefined);
            setRegular(false);
          }}
        />
        <Chip label={t('clients.regular')} selected={regular} onPress={() => setRegular(!regular)} />
        {TIERS.map((k) => (
          <Chip
            key={k}
            label={t(`tiers.${k}`)}
            selected={tier === k}
            onPress={() => setTier(tier === k ? undefined : k)}
          />
        ))}
      </View>
      {c.error ? <Notice tone="danger" message={c.error} /> : null}
      {adding ? (
        <Card>
          <Text variant="subtitle">{t('clients.new')}</Text>
          <TextField label={t('clients.name')} value={name} onChangeText={setName} maxLength={100} />
          <TextField
            label={t('clients.username')}
            hint={t('clients.usernameHint')}
            value={username}
            onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s/g, ''))}
            autoCapitalize="none"
            maxLength={20}
          />
          <Button
            label={t('clients.add')}
            disabled={!name.trim() && !username.trim()}
            loading={c.isCreating}
            onPress={() =>
              c.create(username.trim() ? { username: username.trim() } : { displayName: name.trim() }, () => {
                setAdding(false);
                setName('');
                setUsername('');
              })
            }
          />
        </Card>
      ) : (
        <Button
          label={t('clients.new')}
          icon="person-add"
          variant="secondary"
          onPress={() => setAdding(true)}
        />
      )}
      <QueryView
        query={c.query}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('clients.empty'), icon: 'people-outline' }}
      >
        {(items) => (
          <View style={styles.list}>
            {items.map((client) => (
              <InfoCard
                key={client.id}
                onPress={() => onOpen(client.id)}
                leading={<Monogram name={client.displayName} size={sizes.avatarSmall} />}
                title={client.displayName}
                subtitle={client.username ? `@${client.username}` : undefined}
                details={[
                  { icon: 'repeat', text: t('clients.visits', { count: client.visitsCount }) },
                  { icon: 'cash', text: PEN(client.totalSpent) },
                ]}
                trailing={<TierPill tier={client.tier} />}
              />
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

export function ClientScreen({ shopId, clientId }: { shopId: string; clientId: string }) {
  const { t } = useTranslation('business');
  const c = useClient(shopId, clientId);
  const [notes, setNotes] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<string | null>(null);
  return (
    <Screen>
      {c.error ? <Notice tone="danger" message={c.error} /> : null}
      <QueryView query={c.query}>
        {(client) => (
          <View style={styles.content}>
            <Card>
              <View style={styles.row}>
                <Monogram name={client.displayName} size={sizes.avatar} />
                <View style={styles.flex}>
                  <Text variant="title">{client.displayName}</Text>
                  {client.username ? <Text color="primary">{`@${client.username}`}</Text> : null}
                </View>
                <TierPill tier={client.tier} />
              </View>
              <StatRow>
                <Stat label={t('clients.visitsLabel')} value={String(client.visitsCount)} />
                <Stat label={t('clients.spent')} value={PEN(client.totalSpent)} tone="success" />
              </StatRow>
            </Card>
            <SwitchRow
              title={t('clients.regular')}
              value={client.isRegular}
              onValueChange={(v) => c.save({ isRegular: v })}
            />
            <TextField
              label={t('clients.notes')}
              value={notes ?? client.notes ?? ''}
              onChangeText={setNotes}
              multiline
              maxLength={1000}
            />
            <TextField
              label={t('clients.preferences')}
              value={prefs ?? client.preferences ?? ''}
              onChangeText={setPrefs}
              multiline
              maxLength={500}
            />
            <Button
              label={t('clients.save')}
              onPress={() =>
                c.save({
                  ...(notes !== null ? { notes } : {}),
                  ...(prefs !== null ? { preferences: prefs } : {}),
                })
              }
              loading={c.isSaving}
              disabled={notes === null && prefs === null}
            />
            <Text variant="subtitle">{t('clients.history')}</Text>
            {client.visits.length === 0 ? <EmptyState title={t('clients.noVisits')} /> : null}
            {client.visits.map((v) => (
              <ListRow
                key={`${v.source}-${v.id}`}
                icon={v.source === 'BOOKING' ? 'calendar' : 'receipt'}
                title={v.services.join(', ') || t(`clients.source.${v.source}`)}
                value={`${formatShortDate(v.at, zone)} · ${PEN(v.totalAmount)}`}
              />
            ))}
            <Button label={t('clients.archive')} variant="ghost" onPress={() => c.save({ archived: true })} />
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

// --------------------------------------------------------------------------- Catalog

export function CatalogScreen({ shopId }: { shopId: string }) {
  const { t } = useTranslation('business');
  const theme = useTheme();
  const c = useCatalog(shopId);
  const [importing, setImporting] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  return (
    <Screen>
      <Text color="textSecondary">{t('catalog.intro')}</Text>
      {c.error ? <Notice tone="danger" message={c.error} /> : null}
      <Text variant="subtitle">{t('catalog.items')}</Text>
      <QueryView
        query={c.items}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('catalog.empty'), icon: 'images-outline' }}
      >
        {(items) => (
          <View style={styles.list}>
            {items.map((item) => (
              <InfoCard
                key={item.id}
                leading={
                  item.coverUrl ? (
                    <Image
                      source={{ uri: mediaUrl(item.coverUrl) ?? undefined }}
                      style={[styles.thumb, { borderRadius: theme.radius.md }]}
                    />
                  ) : undefined
                }
                title={item.name}
                subtitle={`${PEN(item.priceAmount)} · ${t('catalog.minutes', { count: item.durationMinutes })}`}
                details={
                  item.fromBarberName
                    ? [{ icon: 'cut', text: t('catalog.from', { name: item.fromBarberName }) }]
                    : []
                }
                trailing={item.styleName ? <Badge label={item.styleName} /> : undefined}
              />
            ))}
          </View>
        )}
      </QueryView>
      <Text variant="subtitle">{t('catalog.sources')}</Text>
      <QueryView
        query={c.sources}
        isEmpty={(items) => items.length === 0}
        empty={{ title: t('catalog.noSources') }}
      >
        {(sources) => (
          <View style={styles.list}>
            {sources.map((src) => (
              <Card key={src.imageId}>
                <View style={styles.row}>
                  <Image
                    source={{ uri: mediaUrl(src.imageUrl) ?? undefined }}
                    style={[styles.thumb, { borderRadius: theme.radius.md }]}
                  />
                  <View style={styles.flex}>
                    <Text>{src.caption ?? t('catalog.photo')}</Text>
                    <Text variant="caption" color="textSecondary">
                      {src.barberName}
                    </Text>
                  </View>
                </View>
                {importing === src.imageId ? (
                  <>
                    <TextField label={t('catalog.name')} value={name} onChangeText={setName} maxLength={80} />
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <TextField
                          label={t('catalog.price')}
                          value={price}
                          onChangeText={setPrice}
                          keyboardType="decimal-pad"
                          maxLength={8}
                        />
                      </View>
                      <View style={styles.flex}>
                        <TextField
                          label={t('catalog.duration')}
                          value={duration}
                          onChangeText={setDuration}
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                    </View>
                    <Button
                      label={t('catalog.import')}
                      loading={c.isImporting}
                      onPress={() =>
                        c.importItem({ imageId: src.imageId, name, price, duration }, () =>
                          setImporting(null),
                        )
                      }
                    />
                  </>
                ) : (
                  <Button
                    label={t('catalog.useAsService')}
                    variant="secondary"
                    onPress={() => {
                      setImporting(src.imageId);
                      setName(src.caption ?? '');
                    }}
                  />
                )}
              </Card>
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

// --------------------------------------------------------------------------- Reports

export function ReportsScreen({ shopId }: { shopId: string }) {
  const { t } = useTranslation('business');
  const [range, setRange] = useState<RangeKey>('week');
  const { from, to } = rangeFor(range);
  const r = useSalesReport(shopId, from, to);
  const [editing, setEditing] = useState<string | null>(null);
  const [percent, setPercent] = useState('');
  return (
    <Screen refreshing={r.query.isRefetching} onRefresh={() => void r.query.refetch()}>
      <RangeChips value={range} onChange={setRange} />
      {r.error ? <Notice tone="danger" message={r.error} /> : null}
      <QueryView query={r.query}>
        {(report) => (
          <View style={styles.content}>
            <StatRow>
              <Stat label={t('reports.total')} value={PEN(report.totalAmount)} tone="primary" />
              <Stat label={t('reports.count')} value={String(report.count)} />
              <Stat label={t('reports.app')} value={PEN(report.appAmount)} />
              <Stat label={t('reports.local')} value={PEN(report.localAmount)} />
              <Stat label={t('reports.ticket')} value={PEN(report.averageTicket)} />
              <Stat
                label={t('reports.clients')}
                value={t('reports.clientsValue', {
                  new: report.newClients,
                  returning: report.returningClients,
                })}
              />
            </StatRow>
            {report.byDay.length > 1 ? (
              <Card>
                <Text variant="subtitle">{t('reports.byDay')}</Text>
                <DayBars
                  days={report.byDay.map((d) => ({ day: d.day, amount: d.appAmount + d.localAmount }))}
                />
              </Card>
            ) : null}
            <Card>
              <Text variant="subtitle">{t('reports.byBarber')}</Text>
              {report.byBarber.map((b) => (
                <View key={b.barberId} style={styles.section}>
                  <ListRow
                    icon="cut"
                    title={b.barberName}
                    value={t('reports.barberLine', {
                      amount: PEN(b.amount),
                      commission: PEN(b.commissionAmount),
                      percent: ((b.commissionBp ?? 0) / 100).toFixed(0),
                    })}
                    onPress={() => {
                      setEditing(b.barberId);
                      setPercent(String((b.commissionBp ?? 0) / 100));
                    }}
                  />
                  {editing === b.barberId ? (
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <TextField
                          label={t('reports.commission')}
                          value={percent}
                          onChangeText={setPercent}
                          keyboardType="decimal-pad"
                          maxLength={5}
                        />
                      </View>
                      <Button
                        label={t('reports.saveCommission')}
                        onPress={() => {
                          const value = Number(percent.replace(',', '.'));
                          if (value >= 0 && value <= 100) r.setCommission(b.barberId, value);
                          setEditing(null);
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </Card>
            <Card>
              <Text variant="subtitle">{t('reports.byService')}</Text>
              {report.byService.map((svc) => (
                <ListRow
                  key={svc.name}
                  icon="pricetag"
                  title={svc.name}
                  value={`${svc.count} · ${PEN(svc.amount)}`}
                />
              ))}
            </Card>
            <Card>
              <Text variant="subtitle">{t('reports.byMethod')}</Text>
              {report.byMethod.map((m) => (
                <ListRow
                  key={m.method}
                  icon="wallet"
                  title={t(`methods.${m.method}`)}
                  value={`${m.count} · ${PEN(m.amount)}`}
                />
              ))}
            </Card>
            {report.full ? (
              <Button
                label={t('reports.csv')}
                variant="secondary"
                icon="share"
                onPress={r.shareCsv}
                loading={r.isSharing}
              />
            ) : (
              <Notice tone="info" message={t('reports.partial')} />
            )}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

// --------------------------------------------------------------------------- Receipts

/** Receipts set-up (owner): provider, series and credentials (sent once, never kept here). */
export function InvoicingScreen({ shopId }: { shopId: string }) {
  const { t } = useTranslation('business');
  const inv = useInvoicing(shopId);
  const [series, setSeries] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [token, setToken] = useState('');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<'FAKE' | 'NUBEFACT' | null>(null);
  return (
    <Screen>
      {inv.error ? <Notice tone="danger" message={inv.error} /> : null}
      <QueryView query={inv.query}>
        {(config) => {
          const p = provider ?? config.provider;
          return (
            <View style={styles.content}>
              <Text color="textSecondary">{t('invoicing.intro')}</Text>
              <SwitchRow
                title={t('invoicing.enabled')}
                value={enabled ?? config.enabled}
                onValueChange={setEnabled}
              />
              <View style={styles.chips}>
                {(['NUBEFACT', 'FAKE'] as const).map((k) => (
                  <Chip
                    key={k}
                    label={t(`invoicing.providers.${k}`)}
                    selected={p === k}
                    onPress={() => setProvider(k)}
                  />
                ))}
              </View>
              <TextField
                label={t('invoicing.series')}
                hint={t('invoicing.seriesHint')}
                value={series ?? config.series}
                onChangeText={(v) => setSeries(v.toUpperCase())}
                autoCapitalize="characters"
                maxLength={4}
              />
              <Text variant="caption" color="textSecondary">
                {t('invoicing.next', { number: config.nextNumber })}
              </Text>
              {p === 'NUBEFACT' ? (
                <>
                  <TextField
                    label={t('invoicing.apiUrl')}
                    value={apiUrl}
                    onChangeText={setApiUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <TextField
                    label={t('invoicing.token')}
                    hint={config.hasCredentials ? t('invoicing.tokenSaved') : t('invoicing.tokenHint')}
                    value={token}
                    onChangeText={setToken}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </>
              ) : null}
              <Button
                label={t('invoicing.save')}
                loading={inv.isSaving}
                onPress={() => {
                  inv.save({
                    provider: p,
                    enabled: enabled ?? config.enabled,
                    series: series ?? config.series,
                    ...(apiUrl.trim() ? { apiUrl: apiUrl.trim() } : {}),
                    ...(token.trim() ? { token: token.trim() } : {}),
                  });
                  // The token is not kept in the app once sent.
                  setToken('');
                }}
              />
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  list: { gap: spacing.sm },
  section: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  price: { width: sizes.cover * 0.7 },
  remove: {
    minWidth: sizes.avatarSmall,
    minHeight: sizes.avatarSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  thumb: { width: sizes.avatar, height: sizes.avatar },
  today: { padding: spacing.md, gap: spacing.sm },
});

// --------------------------------------------------------------------------- Today (panel)

/** "Hoy" at the top of "Mi barbería": what was sold, the register and a quick new sale. */
export function TodaySummary({
  shopId,
  onNewSale,
  onOpenCash,
}: {
  shopId: string;
  onNewSale: () => void;
  onOpenCash: () => void;
}) {
  const { t } = useTranslation('business');
  const theme = useTheme();
  const { from, to } = rangeFor('today');
  const report = useSalesReport(shopId, from, to);
  const cash = useCash(shopId);
  const open = cash.query.data ?? null;
  return (
    <View
      style={[styles.today, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.lg }]}
    >
      <View style={styles.row}>
        <Text variant="subtitle" style={styles.flex}>
          {t('today.title')}
        </Text>
        <Badge
          label={open ? t('today.cashOpen') : t('today.cashClosed')}
          tone={open ? 'success' : 'warning'}
        />
      </View>
      <StatRow>
        <Stat
          label={t('today.sold')}
          value={report.query.data ? PEN(report.query.data.totalAmount) : '—'}
          tone="primary"
        />
        <Stat label={t('today.count')} value={report.query.data ? String(report.query.data.count) : '—'} />
      </StatRow>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button label={t('sale.new')} icon="add-circle" onPress={onNewSale} fullWidth />
        </View>
        <Button label={open ? t('today.seeCash') : t('cash.open')} variant="secondary" onPress={onOpenCash} />
      </View>
    </View>
  );
}
