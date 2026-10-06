# Estado del proyecto

Léelo primero al empezar una conversación nueva.

**Fase actual:** M1 cerrada el 2026-10-06. Siguiente: **M2 (cuenta)**, pendiente de aprobar el plan.

**Backend de referencia:** `docs/api/`, copia de `..\charles\docs\mobile\` al cierre de la Fase 9 del backend.

## M1 — Cerrada

Probada por el usuario en un Android físico: la app carga, conecta con el backend y el sistema de diseño se ve bien. Las correcciones de esa prueba (encabezados, barra de estado y contraste) son solo de JavaScript: se prueban con la compilación instalada. El color de la barra inferior de Android queda para la próxima compilación (ver más abajo).

- Proyecto Expo SDK 57 / React Native 0.86 con nueva arquitectura y compilación de desarrollo. Versiones en `docs/adr/0001-base-tecnica.md`.
- **Configuración:**
  - `app.config.ts` con variantes `development` / `preview` / `production`. En desarrollo: identificador `pe.charlesapp.mobile.dev`, nombre "Charles (dev)" y HTTP permitido solo ahí.
  - `eas.json` con perfiles `development` (APK con dev client), `preview` y `production`.
  - Organización de Expo: `charlesapp-pe`.
- **Módulos nativos ya incluidos en la compilación:** secure-store, location, maps, notifications, device, crypto, netinfo, localization, el SDK de Izipay (con plugin para iOS) y expo-build-properties y expo-navigation-bar.
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
  - Encabezados, barra de estado, barra de navegación de Android y fondo raíz siguen los tokens en los dos temas (`NavigationThemeRoot`, `useStackScreenOptions`, `SystemBars` en `src/shared/ui/navigation.tsx`).
  - Contraste WCAG AA comprobado por pruebas (`src/shared/theme/contrast.ts`): todo texto sobre su fondo ≥ 4,5:1, y todos los estados de los botones (normal, presionado, enviando y deshabilitado) en ambos temas. Los botones deshabilitados usan tokens propios, sin transparencia.
  - Componentes base en `src/shared/ui`: `Text`, `Button`, `TextField`, `Card`, `Screen`, `LoadingState`, `EmptyState`, `ErrorState`, `QueryView` (los cuatro estados), `OfflineBanner`, `ErrorFallback` y `PlaceholderScreen`.
- **Límite de errores global** (`ErrorBoundary` en `app/_layout.tsx`).
- **Navegación con Expo Router:**
  - `(public)`: inicio con el estado del servidor y catálogo del sistema de diseño (solo en desarrollo).
  - `(auth)/login`: pantalla de relleno.
  - `(client)/bookings`: exige sesión.
  - `(staff)/agenda`: exige sesión y el rol OWNER o BARBER.
  - `+not-found`.
- **Comprobación de red en desarrollo:**
  - `pnpm start` ejecuta primero `scripts/dev-network/check.js`. El script compara la IPv4 del wifi (ignora adaptadores virtuales, VPN y los que no tienen puerta de enlace) con la de `.env`, ofrece actualizar `.env` y comprueba `GET /api/v1/health`.
  - Nunca impide arrancar. Para saltarlo existe `pnpm start:skip-check`.
  - En la app, solo con `__DEV__` y la variante de desarrollo, un error de red muestra la URL configurada y el consejo del wifi. Sus textos están en `locales/es/dev.json` y se cargan solo en desarrollo. Se comprobó que el paquete de producción no los contiene.
- **Calidad:**
  - ESLint con límites de capas y funcionalidades.
  - Prettier.
  - Jest: 187 pruebas, todas por encima del 80 % de cobertura en `shared/api` y `shared/payments`.
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

- Revisión rápida, con la compilación instalada, de las correcciones de tema y contraste de M1.
- **M2:** inicio de sesión, registro, verificación, recuperación, perfil, preferencias y selector de tema (con persistencia).
- **Backend:** `dev:pay` (ya pedido; hace falta desde M4), `GET /me/barber` (antes de los bloqueos del barbero) y el resto de `docs/api/AJUSTES-BACKEND.md`.
- Pendientes de publicación: `docs/pendientes-publicacion.md`.

## Compilación instalada y cambios nativos pendientes de compilar

**Compilación de desarrollo instalada en el teléfono del usuario:** la de M1 (commit `cbce85b`).

Cambios nativos aprobados que todavía **no están** en esa compilación. Se aplicarán en la próxima, que el usuario decide cuándo lanzar:

| Cambio | Efecto cuando se compile | Sin compilar |
|---|---|---|
| `expo-navigation-bar` y su plugin (`enforceContrast: false`) | El color de los iconos de la barra inferior de Android sigue el tema | El código lo detecta y no lo usa: la barra queda como la deja el sistema, sin errores |
| `backgroundColor` en `app.config.ts` | Fondo oscuro antes de que cargue la app (sin destello blanco) | Ya se aplica en tiempo de ejecución con `expo-system-ui` |

## Cuándo hace falta una compilación nueva (EAS)

Solo al añadir o actualizar un módulo nativo, o al cambiar `app.config.ts`, `eas.json` o `plugins/`. Los cambios de código JavaScript o TypeScript llegan con `pnpm start` sin recompilar.
