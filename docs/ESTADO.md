# Estado del proyecto

Léelo primero al empezar una conversación nueva.

**Fase actual:** M1 (base), con el código terminado. **Falta la confirmación del usuario en su teléfono** (lista de comprobación manual).

**Backend de referencia:** `docs/api/`, copia de `..\charles\docs\mobile\` al cierre de la Fase 9 del backend.

## M1 — Hecho

- Proyecto Expo SDK 57 / React Native 0.86 con nueva arquitectura y compilación de desarrollo. Versiones en `docs/adr/0001-base-tecnica.md`.
- **Configuración:**
  - `app.config.ts` con variantes `development` / `preview` / `production`. En desarrollo: identificador `pe.charlesapp.mobile.dev`, nombre "Charles (dev)" y HTTP permitido solo ahí.
  - `eas.json` con perfiles `development` (APK con dev client), `preview` y `production`.
  - Organización de Expo: `charlesapp-pe`.
- **Módulos nativos ya incluidos en la compilación:** secure-store, location, maps, notifications, device, crypto, netinfo, localization, el SDK de Izipay (con plugin para iOS) y expo-build-properties.
- **Contrato de la API:**
  - `pnpm sync:api` copia `..\charles\docs\mobile\` completa a `docs/api/` y genera `src/shared/api/generated/schema.ts`.
  - `pnpm check:api`, dentro de `verify`, falla si los tipos no coinciden.
- **Cliente de API** (`src/shared/api`):
  - Un solo cliente `openapi-fetch` con cabeceras `X-App-Version`, `X-App-Platform` y `Accept-Language`.
  - Reintentos con espera creciente para fallos de red (solo GET o peticiones con `Idempotency-Key`) y para 503 con `retryable`. Los 429 respetan la espera indicada si es de 30 s o menos. Los 4xx no se reintentan.
  - Renovación de vuelo único ante 401 `UNAUTHORIZED`. Si la renovación es rechazada, se borra la sesión y se lleva a `/login?returnTo=…`. Si falla por la red, la sesión se conserva.
  - El token de renovación vive solo en SecureStore y el de acceso solo en memoria.
  - `ApiError` / `NetworkError`, un traductor único `translateError` por `code` (los códigos desconocidos muestran el `requestId`) y `fieldErrorsFrom` para `VALIDATION_ERROR`.
  - TanStack Query conectado a la conectividad (NetInfo) y al primer plano de la app.
- **Configuración validada** (`EXPO_PUBLIC_API_URL`, solo el origen y HTTPS fuera de desarrollo). Si no es válida, la app muestra una pantalla de error de configuración.
- **i18n** con `i18next` en español: `src/shared/i18n/locales/es/{common,errors}.json`.
- **Sistema de diseño:**
  - Tokens en `src/shared/theme/tokens.ts`: paleta neutra con acento cobre, temas claro y oscuro, fuente Inter.
  - Componentes base en `src/shared/ui`: `Text`, `Button`, `TextField`, `Card`, `Screen`, `LoadingState`, `EmptyState`, `ErrorState`, `QueryView` (los cuatro estados), `OfflineBanner`, `ErrorFallback` y `PlaceholderScreen`.
- **Límite de errores global** (`ErrorBoundary` en `app/_layout.tsx`).
- **Navegación con Expo Router:**
  - `(public)`: inicio con el estado del servidor y catálogo del sistema de diseño (solo en desarrollo).
  - `(auth)/login`: pantalla de relleno.
  - `(client)/bookings`: exige sesión.
  - `(staff)/agenda`: exige sesión y el rol OWNER o BARBER.
  - `+not-found`.
- **Calidad:**
  - ESLint con límites de capas y funcionalidades.
  - Prettier.
  - Jest: 79 pruebas, todas por encima del 80 % de cobertura en `shared/api` y `shared/payments`.
  - `pnpm verify`.

## Pantallas actuales

| Ruta | Pantalla | Estado |
|---|---|---|
| `/` | Inicio (estado del servidor) | Provisional hasta M3 (Explorar) |
| `/design-system` | Catálogo del sistema de diseño | Solo desarrollo |
| `/login` | Relleno | M2 |
| `/bookings` | Relleno (protegida) | M4 |
| `/agenda` | Relleno (protegida, personal) | M7 |

## Pendiente

- Confirmación del usuario de la lista de comprobación manual de M1.
- `EAS_PROJECT_ID` en `app.config.ts`, después de `eas init`.
- **M2:** inicio de sesión, registro, verificación, recuperación, perfil, preferencias y selector de tema (con persistencia).
- **Backend:** `dev:pay` (ya pedido; hace falta desde M4), `GET /me/barber` (antes de los bloqueos del barbero) y el resto de `docs/api/AJUSTES-BACKEND.md`.
- Pendientes de publicación: `docs/pendientes-publicacion.md`.

## Cuándo hace falta una compilación nueva (EAS)

Solo al añadir o actualizar un módulo nativo, o al cambiar `app.config.ts`, `eas.json` o `plugins/`. Los cambios de código JavaScript o TypeScript llegan con `pnpm start` sin recompilar.
