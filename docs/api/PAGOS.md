# Pagos en la app móvil

Para quien construye la app. Estado al cierre de la Fase 9: el sistema de pagos está completo con la pasarela simulada (`FakeGateway`, Fase 8A). El adaptador real de Izipay es la Fase 8B, **aún no implementada**. Referencias del backend: `docs/pagos-izipay.md` y `docs/izipay/referencia.md`.

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
- **Hoy no hay forma de confirmar un pago fuera de las pruebas automáticas.** El `FakeGateway` firma sus avisos con un secreto aleatorio que existe solo dentro del proceso del servidor, y el antiguo endpoint de pruebas se eliminó en la Fase 8A. Desde la app, una reserva queda en `PENDING_PAYMENT` y vence a los 10 minutos.

### Propuesta (no implementada): confirmar pagos solo en desarrollo

**Recomendada: un comando de consola en el computador del backend:**

```bash
pnpm --filter api dev:pay <bookingId> [--reject]
```

- Arranca la aplicación sin servidor HTTP y aplica el resultado por el mismo camino que el aviso de la pasarela: `applyPaymentResult` (estado, historial, eventos y reembolso si correspondiera).
- **No expone nada en la red:** solo quien tiene acceso al computador del backend puede usarlo.
- **No arranca en producción** (con `NODE_ENV=production` falla de inmediato) ni si `payments.provider` no es `FAKE`.
- Queda en `audit_log` como acción de desarrollo.

**Alternativa, si se necesita desde la app:** un endpoint `POST /api/v1/dev/payments/{bookingId}/simulate`.

- Se registraría solo con `NODE_ENV=development` **y** una variable explícita `DEV_TOOLS_ENABLED=true`.
- Con `NODE_ENV=production` la app no arrancaría si esa variable está activa.
- Respondería 404 en cualquier otro entorno.
- Es más cómodo, pero expone una superficie de red; por eso recomiendo el comando.

Pídeselo a la conversación del backend si lo necesitas: hoy no existe.

## Con Izipay (Fase 8B, plataforma micuentaweb)

1. **El backend crea el pago** con `Charge/CreatePayment` y devuelve en `clientAction`:

   ```json
   {
     "type": "IZIPAY_SDK",
     "data": { "formToken": "…", "publicKey": "…", "apiServerName": "https://api.micuentaweb.pe" }
   }
   ```

   La clave pública no es secreta, pero viene del backend: **no la escribas en el código de la app**.

2. **La app usa el SDK oficial `@lyracom/react-native-sdk-payment-module`:**
   - llama a `initialize(publicKey, { apiServerName })`;
   - luego a `process(formToken, options)`. `paymentMethodType` admite `PaymentMethods.ALL` (por defecto) o `PaymentMethods.CARD`.
   - El SDK **ignora llamadas simultáneas** sin error ni callback: deshabilita el botón mientras procesa.
3. **Al terminar,** el SDK devuelve la respuesta con `kr-answer`, `kr-hash`, `kr-hash-algorithm` y `kr-hash-key`. La app la envía **sin modificar** a `POST /bookings/{id}/payment/verify`, que nunca confirma por sí solo.
4. **La confirmación real** llega al servidor por la IPN de Izipay.

### Requisitos del SDK para la app

- Desde la versión 2.0.0 es un **TurboModule**: exige la **nueva arquitectura** y **React Native 0.77 o superior**.
- **No funciona con Expo Go.** Hace falta una **compilación de desarrollo** (`expo-dev-client`, con EAS Build o `expo run:android` / `expo run:ios`).
- **En iOS** requiere un _config plugin_ que configure en el Podfile los frameworks dinámicos `LyraPaymentSDK`, `LyraMotion`, `LyraMaterial` y `SnapKit`.

### Por confirmar (8B)

- Disponibilidad de Yape, Plin y QR en el SDK.
- Tarjetas de prueba de la tienda de demostración.

Hasta que la 8B esté lista, encapsula el pago en un módulo con dos implementaciones: `FAKE`, que no hace nada y espera la confirmación del servidor, e `IZIPAY_SDK`. Elige según `clientAction.type`.
