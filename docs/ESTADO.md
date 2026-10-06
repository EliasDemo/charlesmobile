# Estado del proyecto

Léelo primero al empezar una conversación nueva.

**Fase actual:** M2 cerrada el 2026-10-06. Siguiente: **M3 (Explorar)**, pendiente de aprobar el plan.

**Backend de referencia:** `docs/api/`, copia de `..\charles\docs\mobile\` sincronizada con las fases 10, 11 y 12 del backend (notificaciones, valoraciones y favoritos, soporte). Correos de desarrollo: `pnpm --filter api dev:mail <correo>` desde `..\charles`.

## M1 — Cerrada

Probada por el usuario en un Android físico: la app carga, conecta con el backend y el sistema de diseño se ve bien. Las correcciones de esa prueba (encabezados, barra de estado y contraste) son solo de JavaScript: se prueban con la compilación instalada. El color de la barra inferior de Android queda para la próxima compilación (ver más abajo).

- Proyecto Expo SDK 57 / React Native 0.86 con nueva arquitectura y compilación de desarrollo. Versiones en `docs/adr/0001-base-tecnica.md`.
- **Configuración:**
  - `app.config.ts` con variantes `development` / `preview` / `production`. En desarrollo: identificador `pe.charlesapp.mobile.dev`, nombre "Charles (dev)" y HTTP permitido solo ahí.
  - `eas.json` con perfiles `development` (APK con dev client), `preview` y `production`.
  - Organización de Expo: `charlesapp-pe`.
- **Módulos nativos ya incluidos en la compilación:** secure-store, location, maps, notifications, device, crypto, netinfo, localization, el SDK de Izipay (con plugin para iOS) y expo-build-properties. `expo-navigation-bar` está aprobado pero pendiente de compilar (ver abajo).
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

## M2 — Cerrada

Probada por el usuario en su Android: registro, inicio de sesión y verificación de correo funcionan. Correcciones tras la prueba: "Verifica tu correo" ahora muestra el correo escrito al iniciar sesión (o un texto sin correo si no se conoce), y las preferencias reenvían `reminders` sin cambiarlo (campo nuevo de la Fase 10).

- **Navegación:** pestañas Explorar · Reservas · Perfil (`app/(tabs)`). Explorar muestra el estado del servidor hasta M3; Reservas, sin sesión, invita a entrar.
- **`features/auth`:**
  - Registro con los requisitos de la contraseña en vivo (10 a 128 caracteres y aviso de contraseñas comunes), teléfono opcional solo de Perú (se envía como `+51 9XX XXX XXX`), mayoría de edad y versión de los términos de `GET /auth/terms`. Si la versión cambió, pide aceptar de nuevo.
  - Inicio de sesión con `returnTo` y `deviceName` = fabricante y modelo (nunca el nombre del dispositivo). `ACCOUNT_LOCKED` muestra una cuenta regresiva y el cliente ya no lo reintenta solo.
  - Verificación de correo con reenvío (espera de 60 s). Se ofrece después de entrar si `emailVerified` es `false`.
  - Recuperación de contraseña en 2 pasos. Al terminar se olvida la sesión local, porque el backend cierra todas.
  - Cierre de sesión normal y en todos los dispositivos, con confirmación. Siempre borra tokens y caché, aunque falle la red.
  - `useSessionEndedRedirect`: un 401 que no se puede renovar lleva a `/login?returnTo=…`.
- **`features/profile`:**
  - Perfil en sus cuatro estados, con aviso si el correo no está verificado.
  - Editar nombre. El teléfono y el correo se muestran sin poder editarse.
  - Preferencias: tema Sistema · Claro · Oscuro, guardado con SecureStore, y canales de notificación (PUSH, EMAIL, IN_APP) con la nota "se activarán pronto" y actualización optimista.
- **`shared/ui` nuevo:** `PasswordField`, `Checkbox`, `ListRow`, `SwitchRow`, `SegmentedControl`, `ConfirmDialog`, `Notice`, `Icon` (`@expo/vector-icons`, solo JavaScript), `applyServerErrors` y `useFieldErrorText`.
- **Enlaces provisionales** a términos y privacidad: `EXPO_PUBLIC_TERMS_URL` y `EXPO_PUBLIC_PRIVACY_URL` (dominio de ejemplo `charlesapp.pe`, a reemplazar).
- **Pruebas:**
  - 263 en total. Hooks de `auth` al 98 % y de `profile` al 100 %.
  - Pruebas de sesión: el cierre de sesión limpia todo y un 401 redirige.
  - Flujos de Maestro en `e2e/` (sin ejecutar todavía: falta instalar Maestro).

### Esperando al backend (pedido por el usuario)

- `UpdateProfileDto.phone` **sigue** declarado como `object` en el contrato tras la sincronización de las fases 10 a 12. Hasta que sea `string | null` y se ejecute `pnpm sync:api`, la app no permite cambiar el teléfono (está listo para activarse).
- `GET /auth/terms` debería devolver los enlaces de términos y privacidad.

## Pantallas actuales

| Ruta | Pantalla | Estado |
|---|---|---|
| `/` (pestaña Explorar) | Estado del servidor | Provisional hasta M3 |
| `/bookings` (pestaña Reservas) | Invitación a entrar / relleno | M4 |
| `/profile` (pestaña Perfil) | Perfil o invitación a entrar | M2 |
| `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Cuenta | M2 |
| `/profile/edit`, `/profile/preferences` | Perfil (protegidas) | M2 |
| `/design-system` | Catálogo del sistema de diseño | Solo desarrollo |
| `/agenda` | Relleno (protegida, personal) | M7 |

## Pendiente

- Revisión rápida, con la compilación instalada, de las correcciones de tema y contraste de M1.
- Eliminar la cuenta: no hay endpoint (pendientes de publicación #10).
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
