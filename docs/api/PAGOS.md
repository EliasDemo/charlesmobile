# Pagos en la app móvil

Para quien construye la app. **Pasarela para pruebas reales: Mercado Pago** (`MERCADOPAGO_WEB`, ver abajo). Estado al cierre de la Fase 8B: el sistema de pagos funciona con la pasarela simulada (`FakeGateway`, desarrollo) y con **Izipay** (formulario web con tarjeta y Yape, abierto en un WebView). Izipay está probado con un simulador: falta una cuenta real (ver `docs/pendientes-produccion.md`). Referencia del backend: `docs/izipay/referencia.md`.

## Principio que no cambia

**La app nunca confirma un pago.** Una reserva pasa a `CONFIRMED` solo cuando el servidor recibe la confirmación verificada de la pasarela (IPN firmado o consulta directa al proveedor). Lo que la app reenvía tras pagar solo hace que el servidor consulte a la pasarela. Charles nunca recibe datos de tarjeta: los captura el SDK de la pasarela.

## Flujo común (hoy y con Izipay)

1. `POST /bookings` crea la reserva `PENDING_PAYMENT`, con 10 minutos para pagar (`expiresAt`). La respuesta incluye `payment: { paymentId, provider, status, amount, clientAction }`.
   - `clientAction` es lo que la app necesita para mostrar el pago.
   - Si llega `null`, la pasarela no respondió al crear el pago: reintenta con el paso 2.
2. `POST /bookings/{id}/payment` inicia o **reintenta** el pago. Es idempotente: siempre devuelve el mismo pago en la pasarela.
   - Respuestas posibles: 502 `PAYMENT_PROVIDER_ERROR` (reintentar) y 409 `PAYMENT_NOT_AVAILABLE` (ya no está pendiente o venció).
3. La app muestra el pago con `clientAction`.
4. Tras pagar, la app reenvía el resultado firmado: `POST /bookings/{id}/payment/verify` con el cuerpo **tal cual** lo devolvió el SDK. Responde `{ outcome, paymentStatus }`:
   - `CONFIRMED`: la pasarela lo tiene pagado y la reserva quedó confirmada;
   - `UNCHANGED`: aún no figura pagado;
   - `REVIEW`: algo no coincide; se revisa;
   - `UNAVAILABLE`: la pasarela no respondió.
5. Consulta el estado con `GET /bookings/{id}/payment` o `GET /bookings/{id}` hasta ver `CONFIRMED`.
   - Si el aviso de la pasarela se pierde, la conciliación del servidor lo corrige sola, normalmente en menos de 2 minutos. Muestra "Confirmando tu pago…".
   - Si el plazo vence y el pago llega después, la reserva queda `EXPIRED` y el servidor devuelve el dinero completo de forma automática.

## Hoy: `FakeGateway` (desarrollo)

- `clientAction` es `{ type: "FAKE", data: { paymentId } }`.
- No hay pantalla de pago real.
- Para confirmar o rechazar el pago de una reserva `PENDING_PAYMENT`, en el computador del backend:

  ```bash
  pnpm --filter api dev:pay <bookingId>            # pago confirmado → CONFIRMED
  pnpm --filter api dev:pay <bookingId> --reject   # pago rechazado → CANCELLED, turno liberado
  ```

  - Aplica el resultado **por el mismo camino que el aviso real**: un webhook firmado por la pasarela simulada que procesa `WebhooksService` (firma, eventos, máquina de estados, reembolso de pagos huérfanos).
  - No es un endpoint: no expone nada en la red.
  - Falla con `NODE_ENV=production` y si `payments.provider` no es `FAKE`.
  - Queda en `audit_log` (`dev.payment_simulated`).

## Con Izipay (Fase 8B): formulario web en un WebView

Sin módulos nativos: funciona en **Expo Go** con `react-native-webview`.

1. `clientAction` llega así:

   ```json
   {
     "type": "IZIPAY_WEB",
     "data": {
       "paymentUrl": "https://…/api/v1/payments/izipay/checkout/{paymentId}?e=…&s=…",
       "doneUrlPrefix": "https://…/api/v1/payments/done"
     }
   }
   ```

2. **Abre `paymentUrl` en un `WebView`** a pantalla completa. Es la página de pago de Charles, que carga el formulario oficial de Izipay: tarjeta (Visa, Mastercard, Amex, Diners) y **Yape** (número + código de aprobación de la app de Yape, hasta S/ 2000). Los datos de la tarjeta nunca pasan por Charles ni por la app.
   - El enlace es personal y vence a los 30 minutos (la reserva vence antes, a los 10). Si vence, llama a `POST /bookings/{id}/payment` para obtener uno nuevo.
3. **Detecta el final** con `onNavigationStateChange` (o `onShouldStartLoadWithRequest`): cuando la URL **empieza con `doneUrlPrefix`**, cierra el WebView. Esa URL trae `status` (`success`, `pending`, `error`, `cancel` o `expired`), `paymentId` y `bookingId`.
   - `success`: muestra "Confirmando tu pago…" y consulta `GET /bookings/{id}` hasta ver `CONFIRMED` (el servidor ya consultó a Izipay; la notificación también llega).
   - `error`: "El pago no se completó". La reserva **sigue pendiente**: ofrece reintentar (vuelve a abrir el formulario) mientras no venza.
   - `cancel`: el cliente cerró el formulario; igual que `error`, sin cobro.
   - `expired`: la reserva venció o ya estaba pagada; recarga la reserva.
4. Si el usuario cierra el WebView a mano, haz lo mismo que con `success`: consulta la reserva (puede haber pagado).
5. **No hace falta** `POST /bookings/{id}/payment/verify` con Izipay: el backend recibe el resultado directamente.

Ejemplo mínimo:

```tsx
<WebView
  source={{ uri: action.data.paymentUrl }}
  onShouldStartLoadWithRequest={(req) => {
    if (req.url.startsWith(action.data.doneUrlPrefix)) {
      const status = new URL(req.url).searchParams.get('status');
      onFinish(status); // cierra y consulta la reserva
      return false;
    }
    return true;
  }}
/>
```

### Comisión de Charles

- La configura ADMIN (`fees.*`). Si la paga el **cliente**, la reserva trae una línea `FEE` con monto y el total la incluye: muéstrala en el resumen antes de pagar. Si la asume la **barbería** (por defecto), el cliente no la ve.
- La barbería ve en cada reserva `commission: { amount, payer }` (para el cliente siempre `null`).

### En el modo de pruebas

La página muestra "Modo de pruebas: no se cobra dinero real". Las tarjetas de prueba las da Izipay con la cuenta de pruebas.

## Con Mercado Pago (Checkout Pro): `MERCADOPAGO_WEB`

Mismo patrón que Izipay: `clientAction = { type: "MERCADOPAGO_WEB", data: { paymentUrl, doneUrlPrefix } }`.

1. Abre `paymentUrl` (checkout de Mercado Pago: tarjeta, cuenta de Mercado Pago y **Yape**) en un WebView.
2. Cierra al llegar a `doneUrlPrefix` y lee `status`:
   - `success`: "Confirmando tu pago…" y consulta la reserva hasta `CONFIRMED`.
   - `pending`: el pago quedó **pendiente** (por ejemplo, Yape). Muestra "Tu pago está en proceso" y consulta la reserva; se confirma cuando Mercado Pago lo apruebe. Si llega después del vencimiento, el servidor devuelve el dinero.
   - `error`: rechazado; la reserva sigue pendiente, ofrece reintentar.
3. Para reintentar o si el enlace venció: `POST /bookings/{id}/payment` (nuevo `paymentUrl`).
4. **Prueba real (modo de prueba):** inicia sesión en el checkout con el **comprador de prueba** y usa las tarjetas de prueba (titular `APRO` = aprobado, `OTHE` = rechazado, `CONT` = pendiente). Ver `docs/mercadopago/referencia.md`.

Mercado Pago sugiere `expo-web-browser` (Custom Tabs) en su guía de Expo Go; si el WebView diera problemas con su login, se puede usar ese navegador, que también terminará en `doneUrlPrefix`.

Encapsula el pago en un módulo que elija según `clientAction.type`: `FAKE` (espera la confirmación; en desarrollo se paga con `dev:pay`), `IZIPAY_WEB` o `MERCADOPAGO_WEB` (los dos con WebView).
