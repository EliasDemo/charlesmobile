# Estado del proyecto

Léelo primero al empezar una conversación nueva.

**Fase actual:** M8 (notificaciones) en curso, plan aprobado el 2026-10-10. M7 terminada, pendiente de la prueba del usuario. M5 espera la Fase 8B del backend (Izipay). M4.5 parte 2: fotos aplicadas; falta `cover-generic`.

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

## M3 — Cerrada

Probada por el usuario: todo funciona según lo planteado. **Pendiente pedido por el usuario:** una pasada de diseño para mejorar el aspecto visual (se planificará como tarea aparte). Sigue pendiente la compilación final con la clave de Maps (opción A): hasta entonces la vista de mapa de Android muestra un aviso.

**Tras la sincronización de la API:** `isFavorite` llega en el detalle y en la búsqueda (con sesión opcional). El corazón lo usa y ya no lee la lista completa de favoritas; los resultados muestran un corazón si es favorita, y al iniciar sesión se invalidan los datos leídos como visitante. Las alternativas muestran su turno en la zona de **su** barbería (`timezone` en `SearchResultDto`).

- **`features/search` (Explorar):**
  - Por defecto, lo mejor valorado (sin ubicación). Búsqueda por texto, que espera 400 ms tras dejar de escribir y empieza desde 2 caracteres.
  - Chips de categoría, filtros y orden. Los tramos de precio se definen solo en `src/features/search/config/pricePresets.ts`.
  - Lista infinita y mapa.
  - "Cerca de mí": explicación previa, permiso del sistema, denegado o bloqueado (con "Abrir ajustes"). Las coordenadas viven solo en memoria y los resultados con ubicación se descartan de la caché a los 5 minutos. Fuera de Perú, se busca sin ubicación.
  - Las tarjetas ocultan lo que no viene: distancia, "desde" y valoración.
- **Mapa:**
  - `react-native-maps` (iOS: Apple Maps). En Android solo se muestra si `EXPO_PUBLIC_MAPS_ANDROID_ENABLED=true`; si no, aparece un aviso con "Ver la lista".
  - "Buscar en esta zona" busca alrededor del centro del mapa sin pedir permiso.
- **`features/barbershop`:**
  - Detalle con portada provisional (iniciales), favorito, "Reservar" deshabilitado con "Disponible pronto", información (lo que no viene se oculta), "Cómo llegar" (app de mapas del sistema), "Llamar", enlaces (solo se abren URL reales), cierre temporal con fecha de reapertura, horario semanal en la zona de la barbería, servicios por categoría, barberos y valoraciones. Cada sección carga y falla por separado. Un 404 muestra "No encontramos esta barbería".
  - **Servicio:** próximo turno y, si no hay, las alternativas.
  - **Valoraciones:** lista infinita con filtros por estrellas y por barbero, y la respuesta de la barbería.
- **`features/favorites`:**
  - Corazón con cambio inmediato y reversión si falla. Sin sesión, lleva al inicio de sesión y vuelve.
  - "Mis favoritas" en Perfil, con lista infinita y quitar.
  - El estado sale de la lista paginada (100 por página) hasta que el backend agregue `isFavorite`.
- **`shared/ui` nuevo:** `Chip`, `SearchField`, `Badge`, `RatingLabel`, `Monogram`, `InfiniteList`, `DayPicker`, y el caso 404 en `QueryView`.
- **`shared/lib` nuevo:** formateadores de distancia, duración y valoración; `upcomingDays`; ubicación; enlaces externos; `useDebouncedValue`; dinero sin decimales y sin símbolo.
- **Calidad:**
  - ESLint permite `import type` desde `api/` en las vistas, nunca llamadas.
  - Rutas tipadas: `pnpm typecheck` genera `.expo/types/router.d.ts` desde `app/` (`scripts/generate-route-types.js`) antes de `tsc`, así que un `href` inexistente falla `verify` incluso en una copia nueva. El fallo de expo-router en Windows (tomaba archivos de `src/` como rutas porque compara `..` con `../`) se corrige con `patches/@expo__router-server@57.0.12.patch` (`pnpm patch`). Al actualizar Expo, revisar si el parche sigue haciendo falta.
  - 310 pruebas. Flujo de Maestro `e2e/search-detail.yaml`.
- **Se eliminó `features/health`.** El inicio provisional lo reemplaza Explorar; el sistema de diseño se abre desde Perfil (solo en desarrollo).

### Pedidos al backend (M3)

- ~~`isFavorite`~~ y ~~`timezone` en las alternativas~~: recibidos y en uso.
- `barbershop.timezone` en `BookingDto` (pedido por el usuario). Mientras tanto, M4 lee el detalle de cada barbería para su zona.

## M4 — Cerrada

**Verificado por el usuario en su Android:** reservar "Corte clásico" en Barbería Demo Miraflores crea la reserva; "Tu reserva" muestra "Pendiente de pago" con cuenta regresiva, "Pagar" deshabilitado y el ID de desarrollo; aparece en Reservas > Próximas con la hora correcta; `dev:pay` con ese ID la deja en `CONFIRMED`.

**Pendientes de verificación del usuario** (avisará si encuentra fallos):
- Pago rechazado (`pnpm --filter api dev:pay <ID> --reject`) → "Cancelada".
- Vencimiento a los 10 minutos → "Vencida" con "Reservar de nuevo".
- Límite de 2 reservas pendientes (`TOO_MANY_PENDING_BOOKINGS`).
- Turno ocupado (`SLOT_NOT_AVAILABLE`) → vuelve a los turnos conservando el resto.
- Cancelación con vista previa de la devolución y actualización de las listas.

- **`features/booking`:**
  - **Reservar** (`/book/[barbershopId]`): servicio, barbero ("Cualquiera disponible" o los que hacen ese servicio según `serviceIds`), día (chips dentro del horizonte; `DATE_OUT_OF_RANGE` lo acota a `lastBookableDate`) y turno, agrupado por la mañana, la tarde y la noche, en la zona de la barbería. Sin turnos ese día, muestra las alternativas de esa fecha.
  - **Resumen** (`/book/summary`, público): muestra el precio del servicio y aclara que el total definitivo aparece al confirmar.
    - La cuenta se pide al tocar "Confirmar" (inicio de sesión o verificación de correo con `returnTo`), y la selección vive en memoria (`bookingDraft`).
    - El botón se bloquea mientras se envía.
  - **`Idempotency-Key`:**
    - Una por intento, creada al confirmar.
    - Se reutiliza tras un error de red, un 5xx o un 429.
    - Se descarta si cambia la selección o tras un error definitivo.
  - **Errores:** `SLOT_NOT_AVAILABLE` vuelve a los turnos con un aviso, conservando servicio, barbero y día; `TOO_MANY_PENDING_BOOKINGS` ofrece "Ver mis reservas"; `EMAIL_NOT_VERIFIED` lleva a verificar.
  - **Reserva** (`/bookings/[id]`):
    - Estado real de la API. Si está pendiente, la consulta se repite cada 10 s solo mientras la pantalla está visible, al volver a primer plano y al vencer `expiresAt`, y se detiene en cuanto deja de estar pendiente.
    - Cuenta regresiva, "Pagar" deshabilitado ("Disponible pronto") y desglose de precio de la API.
    - Vencida: "Reservar de nuevo". Cancelada: quién la canceló, el motivo y las devoluciones (`GET /payment`).
  - **ID en desarrollo:** solo con `__DEV__` y la variante de desarrollo, el ID de la reserva con "Compartir o copiar el ID" (`Share` de React Native: no hay módulo de portapapeles en la compilación). Se comprobó que el paquete de producción no lo contiene.
  - **Cancelar:**
    - El botón aparece solo si `cancellation-preview` dice `allowed`.
    - El diálogo muestra la devolución (monto, % y regla en español).
    - Al confirmar se actualizan el detalle, las listas, la vista previa y los turnos, sin recargar a mano.
  - **Mis reservas** (pestaña Reservas): Próximas e Historial con lista infinita. La hora se muestra en la zona de cada barbería.
- **`features/barbershop`:** "Reservar" habilitado en el detalle y en el servicio. Se exponen `useBarbershopQuery`, `useServicesQuery`, `useBarbersQuery` y `useAlternativesQuery`, para que las reservas compartan caché.
- **Rutas tipadas:** `pnpm typecheck` genera los tipos en `types/generated/` (ignorada por git), no en `.expo/types`, para que el servidor de desarrollo no los pise mientras corre.
- **Pruebas:** 336 en total; hooks de `booking` con 94 % de cobertura. Flujo de Maestro `e2e/book-cancel.yaml`.

## M4.5 — Diseño

### Parte 1 — Código terminado (falta la revisión del usuario con capturas)

- **Colores de estado:** tokens `status{Pending,Success,Neutral,Danger}{Bg,Fg}` en claro y oscuro, con contraste ≥ 4,5:1 comprobado por pruebas. `StatusPill` siempre lleva icono y texto:
  - Pendiente de pago: ámbar, reloj.
  - Confirmada: verde, check.
  - Atendida: neutro, doble check.
  - Vencida: neutro, reloj de arena.
  - Cancelada: rojo, X.
  - No asistió: rojo, persona tachada.
  - Lo mismo en las tarjetas de búsqueda: abierta, cerrada, cerrada temporalmente, turno ahora.
- **Jerarquía:**
  - Reserva pendiente: tarjeta superior con la cuenta regresiva en tipografía `hero` (en rojo con menos de 1 minuto, siempre con su texto) y "Pagar" como única acción principal.
  - "Cancelar reserva" pasa a secundaria y "Reservar de nuevo" a principal.
- **Tarjetas:**
  - `InfoCard` (dato principal grande; secundarios con iconos pequeños), usada en resultados, reservas y favoritas.
  - Iconos por categoría de servicio (`categoryIcon`, con uno genérico de respaldo); precio de cada servicio destacado.
- **Títulos duplicados:**
  - En Reservas, la etiqueta del selector queda solo para el lector de pantalla.
  - Inicio de sesión, registro, verificación, recuperación y resumen ya no repiten el título en el encabezado (este conserva el botón de volver).
- **Bienvenida:**
  - 3 páginas (`features/onboarding`, ruta `/welcome`), solo la primera vez (marca en SecureStore), con "Saltar", indicador accesible y "Empezar".
  - En Perfil, "Ver la bienvenida de nuevo".
  - Las ilustraciones son iconos del tema.
- **Detalles finos:**
  - Esqueletos (`Skeleton`, `SkeletonCard`, `SkeletonList`) en lugar del indicador en listas, detalle y secciones; quietos con "Reducir movimiento".
  - Transiciones: deslizamiento lateral, filtros desde abajo y fundido entre pestañas; sin animación si el sistema pide reducir movimiento.
  - Pantallas vacías con ilustración (búsqueda, reservas con "Explorar barberías", historial, favoritas y valoraciones).
- **Regla de ESLint:** en `src/features` y `app` no se permiten colores (`#…`, `rgb(…)`, `hsl(…)`) ni `fontSize` numéricos sueltos.
- **Tamaño:** el paquete de producción de Android sigue igual (4,2 MB de JS y 7,4 MB de recursos), porque la parte 1 no agrega imágenes.

**Correcciones tras la primera revisión (tema oscuro):**
- Explorar dice "Barberías" si ningún resultado tiene valoraciones.
- La invitación a entrar es un solo bloque: "Iniciar sesión" como botón principal y "Crear cuenta" justo debajo.
- Bienvenida: imagen grande arriba (`BrandImage`, lista para las fotos) con el texto debajo; "Saltar" junto a "Siguiente", abajo.
- Registro: "Acepto los términos y condiciones", sin la versión interna (que se sigue enviando).
- Las tarjetas de reserva usan el icono de la categoría del servicio.

**Pedido al backend:** `service.categoryKey` en `BookingDto`. Mientras tanto, la categoría se busca en los servicios de la barbería (en caché), con el icono genérico si el servicio ya no existe.

### Parte 2 — Imágenes (en curso)

- **Aplicadas (Gemini, revisadas sin texto ni marcas):** bienvenida (3), banda superior de inicio de sesión y registro (`auth-background`) y portadas `cover-haircut`, `cover-beard`, `cover-haircut_beard`, `cover-kids_haircut`. 8 imágenes: 5,7 MB → 277 KB. Originales fuera del repositorio (`assets/stock/` en `.gitignore`).
- **Rechazada:** `cover-generic` (carteles con nombre de barbería inventado). Mientras tanto, ilustración con iconos. Pantallas vacías: opcionales, con ilustración.

- **Listo:**
  - `pnpm images:optimize` (`scripts/optimize-images.mjs`, con `sharp` como herramienta de desarrollo) convierte `assets/stock/` a WebP por uso (1080, 720 o 480 px) en `assets/images/` y genera `src/shared/ui/brandImages.generated.ts`. Omite cualquier foto sin su fila de licencia.
  - `BrandImage`: foto o ilustración de respaldo, velo del tema y etiqueta "Imagen ilustrativa".
  - Portada del detalle: la categoría con más servicios de la barbería, con `cover-generic` por defecto, y siempre "Imagen ilustrativa".
  - Plantilla `docs/licencias-imagenes.md`.
- **Falta:**
  - Que el usuario copie las fotos con su URL, autor y licencia.
  - Decidir qué categorías tienen foto.
  - Aplicarlas a la bienvenida, al fondo de inicio de sesión y registro (con velo) y a las pantallas vacías.
  - Medir el tamaño final.

## Antes de M6 — Contrato nuevo y eliminación de cuenta (verificado)

**Verificado por el usuario en su Android:** teléfono editable (error con `123`, vacío lo borra), enlaces de términos solo si el backend los tiene, horas de Lima en reservas, bloqueo por único responsable, eliminación con reserva pendiente (devolución, fecha a 30 días, contraseña incorrecta, sesión borrada), arrepentimiento con "Cancelar eliminación" y correos con `dev:mail`.

- **Sincronización de la API:**
  - `UpdateProfileDto.phone` ya es `string | null`: el teléfono se edita en el perfil con la validación de Perú, y vacío lo borra (`null`).
  - `GET /auth/terms` trae `termsUrl` y `privacyUrl`: se muestran solo si llegan y son web (`parseOptionalUrl`). Se quitaron `EXPO_PUBLIC_TERMS_URL` y `EXPO_PUBLIC_PRIVACY_URL`.
  - `barbershop.timezone` en las reservas: se quitó la lectura del detalle de cada barbería.
  - **Sigue pendiente en el backend:** `service.categoryKey` en `BookingDto` (hoy se busca en los servicios de la barbería).
- **Eliminación de cuenta** (`docs/api/CUENTA.md`):
  - Perfil → "Eliminar mi cuenta" (`/profile/delete-account`): vista previa con bloqueos (`SOLE_OWNER`, `STAFF_ROLE`), consecuencias, plazo de `graceDays` y la fecha, y las reservas que se cancelarán con su devolución en la zona de su barbería. Se confirma con la contraseña.
  - Errores: `INVALID_CREDENTIALS` junto al campo; `DELETION_BLOCKED` vuelve a leer los bloqueos.
  - Al confirmar se borran la sesión y la caché, y se muestra `/account-deleted` con la fecha.
  - **Arrepentirse:** si el inicio de sesión responde `ACCOUNT_PENDING_DELETION`, se pide `POST /auth/support-access` con el mismo correo y contraseña. El token limitado (`scope: "deletion"`) vive solo en memoria y nunca es la sesión.
    - `/account-pending` muestra la fecha y "Cancelar eliminación" (`DELETE /me/account/deletion`); luego, inicio de sesión normal.
    - Si el acceso venció, pide iniciar sesión de nuevo.
  - El cliente HTTP respeta un `Authorization` explícito y nunca intenta renovar la sesión por un token limitado.
- **Pruebas:** 379 en total.

## M6 — Cerrada (gestión de barbería)

Confirmada por el usuario en su teléfono.

- **Modo barbería:** en Perfil, "Cambiar a modo barbería/cliente" (solo con rol OWNER o BARBER del token). Se guarda en el dispositivo. En modo barbería las pestañas son Mi barbería, Agenda (relleno hasta M7) y Perfil.
- **Crear:** Perfil → "Crear mi barbería" (`/create-shop`): barbería o barbero independiente; ubicación con "Usar mi ubicación actual". Al crear se renueva la sesión para traer el rol nuevo y se pasa a modo barbería.
- **Mi barbería** (`/shop`): varias barberías con selector, estado (en revisión, suspendida) y secciones: datos, estado de atención, servicios, barberos, responsables, horario y bloqueos (`/shop/[shopId]/...`).
- **Servicios:** precio en soles convertido a céntimos (solo conversión de unidades), duración de 5 a 480 min en pasos de 5, categoría, disponible; eliminar con confirmación.
- **Barberos:** crear, "Registrarme como barbero", editar, activo, servicios que realiza, invitar una cuenta por correo, horario propio.
- **Responsables:** lista, cambio de rol, quitar con confirmación, invitar por correo.
- **Horario:** semana con varias franjas por día en pasos de 5 min, en la zona de la barbería; el barbero puede usar el horario de la barbería. Avisa las reservas que quedan fuera (`bookingsOutsideSchedule`).
- **Bloqueos:** para toda la barbería o un barbero; tipo, día, horas y motivo. `BLOCK_OVERLAPS_BOOKINGS` explica cuántas reservas chocan. El barbero ve los suyos desde "Como barbero" (su horario solo lectura).
- **Invitaciones** (`/profile/invitations`): aceptar con el código del correo y renovar la sesión.
- **Pruebas:** lógica (precio, semana) y pantallas (inicio vacío, con datos y error; servicios; horario; bloqueo que choca; invitación con renovación). Maestro: `e2e/shop-management.yaml`.
- Sin cambios nativos (la ubicación ya estaba en la compilación).
- **Alta con revisión previa** (`docs/api/ALTA.md`, contrato sincronizado después de la primera prueba):
  - El campo `ruc` ya no existe (enviarlo daba 400 `whitelistValidation`). Se reemplazó por el **documento del responsable** (`ownerDocument`: RUC o DNI), opcional al crear y omitido si está vacío. Validación local de largo, prefijo y dígito verificador del RUC; los errores `ownerDocument.number`/`type` del backend van junto al campo.
  - Al editar, solo el OWNER ve el documento enmascarado y puede cambiarlo (`PUT /barbershops/{id}/owner-document`). Nunca se muestra el número completo.
  - Estados nuevos `DRAFT` y `CHANGES_REQUESTED`. Sección **Revisión** (`/shop/[shopId]/review`) mientras no es pública: lo que falta, el motivo de soporte y "Enviar/Reenviar a revisión" (según `canSubmit`, solo OWNER; el MANAGER ve el aviso). `REVIEW_REQUIREMENTS_MISSING` muestra lo que falta.
- **Resuelto en el backend:** `service.categoryKey` llega en las reservas; se quitó la búsqueda en los servicios de la barbería.
- El contrato ya publica el `pattern` de `ownerDocument.number` (8 u 11 dígitos, solo dígitos); la app ya enviaba solo dígitos.

## M7 — Agenda y atención (código terminado; falta la prueba del usuario)

- **Pestaña Agenda** (modo barbería): responsable o administrador → `GET /barbershops/{id}/agenda` (filtro por barbero, selector de barbería si administra varias); barbero → `GET /me/barber/agenda` (perfil activo). Si es ambas cosas, selector "Toda la barbería / Mi agenda".
- Día: de 90 días atrás a 30 adelante, el rango del backend (`DATE_OUT_OF_RANGE` fuera de él); el selector se abre en el día elegido. Horas en la zona de la barbería. Citas y bloqueos en una sola línea de tiempo; aviso `pendingAttention`; se refresca sola cada minuto y al deslizar.
- **Acciones solo según `actions` de la API:** Atendida, No asistió (confirmación: sin devolución) y Corregir (motivo de 3 a 300, ATTENDED ↔ NO_SHOW). Tras cada acción, o si falla, se vuelve a pedir la agenda. Errores por `code` (`ATTENDANCE_NOT_ALLOWED`, `NO_SHOW_NOT_ALLOWED`, `ATTENDANCE_CORRECTION_NOT_ALLOWED`).
- **Cancelar desde la barbería:** botón "Cancelar cita" solo con `actions.canCancel`; motivo obligatorio de 3 a 300; avisa que se devuelve todo y, al terminar, muestra el monto devuelto que responde el backend (`refund.amount`).
- **Contrato con límites publicados** (sincronizado el 2026-10-10): la app ahora valida igual que el backend: nombre de cuenta 2–120; barbería: nombre 2–120, dirección 5–200, descripción ≤1000, URLs ≤300; barbero: nombre 2–80, presentación ≤500; servicio: nombre 2–80, descripción ≤500; motivo de cierre 2–200; motivo de bloqueo ≤200; correos de invitación ≤254 (`shop-management/schemas/limits.ts`).
- **Para probar:** `pnpm --filter api dev:booking --barber barbero.demo@example.com --start -20m --confirm` (desde `..\charles`); `--start -47h --attended` para la corrección. Ventanas en `docs/api/DATOS-PRUEBA.md`.
- Pruebas: `src/features/agenda/__tests__` (acciones según la API, sin cancelar, atendida, no-show con confirmación, error de plazo, corrección con motivo, vacío, error, vista de barbero). Maestro: `e2e/agenda-attendance.yaml`.
- Sin cambios nativos.

## M4.6 — Rediseño visual (código terminado; falta la revisión del usuario con capturas)

- **Cobre renovado** (más vivo) con neutros fríos en tema claro y negro azulado en oscuro; estados más saturados. Contraste mínimo verificado por las pruebas de `shared/theme`.
- **Distancias:** margen lateral de 20 (`spacing.gutter`), radios 8/12/18/24, botones en forma de píldora con ícono opcional, tarjetas con sombra suave en tema claro y borde fino en oscuro (`useSurfaceStyle`).
- **Confirmaciones:** `ConfirmDialog` ahora es una hoja que sube desde abajo, con ícono grande. **Mensajes breves** (`showToast` + `ToastHost` en la raíz) para acciones rápidas de la agenda.
- **Íconos:** filas del perfil (`ListRow icon`), selector de días en mosaicos (día de la semana y número), `IconTile` con tono de estado.
- **Agenda:** fecha larga del día, resumen en tarjetas (citas, por marcar, atendidas), línea de tiempo con hora a la izquierda y punto de color por estado; bloqueos con borde punteado; campana también en Agenda.
- **Mi barbería:** tarjeta de cabecera (inicial, nombre, rol, tipo y estado) y secciones en cuadrícula de mosaicos con ícono y descripción (`ActionTile`/`TileGrid`); "Como barbero" también en mosaicos.
- Sin cambios nativos. La vibración al confirmar (`expo-haptics`) quedó fuera.

## M8 — Notificaciones (código terminado; falta la prueba del usuario)

- **Bandeja** (`/notifications`, protegida): `GET /me/notifications` con lista infinita; los no leídos con "Nuevo"; al tocar se marca leído (`POST .../{id}/read`) y abre su pantalla: `booking` → la reserva; `barbershop` y `review` → Mi barbería (modo barbería); `ticket` y `account` → la bandeja hasta M9. "Marcar todo como leído".
- **Campana** con el número de no leídos (`unread-count`, cada minuto y al volver a la app), arriba a la derecha en Explorar y en Mi barbería, solo con sesión.
- **Permiso de push:** se explica y se pide una sola vez, en la **primera reserva confirmada** (pantalla de la reserva). Si se niega, Preferencias muestra el aviso y "Abrir ajustes".
- **Registro del dispositivo** (`PUT /me/devices`, token en el cuerpo): al aceptar el permiso y al abrir la app con sesión y permiso. Sin token (Android sin Firebase) no hace nada y la bandeja funciona igual. Al cerrar sesión el backend borra el dispositivo.
- **Toque en un push:** abre su pantalla, también con la app cerrada. El push nunca trae datos sensibles.
- Pruebas: `src/features/notifications/__tests__`. `expo-notifications` simulado en `jest.setup.tsx`.
- **Push real en Android: pendiente de Firebase (FCM)** en la compilación final (ver cambios nativos pendientes). En desarrollo el backend usa `PUSH_DRIVER=fake`.

## Pantallas actuales

| Ruta | Pantalla | Estado |
|---|---|---|
| `/` (pestaña Explorar) | Búsqueda: lista y mapa | M3 |
| `/search-filters` | Filtros (modal) | M3 |
| `/barbershop/[id]` | Detalle de barbería | M3 |
| `/barbershop/[id]/service/[serviceId]` | Servicio: próximo turno y alternativas | M3 |
| `/barbershop/[id]/reviews` | Todas las valoraciones | M3 |
| `/book/[barbershopId]` | Reservar: servicio, barbero, día y turno | M4 |
| `/book/summary` | Resumen y confirmar | M4 |
| `/bookings` (pestaña Reservas) | Mis reservas: próximas e historial | M4 |
| `/bookings/[id]` | Reserva: pendiente, confirmada, vencida o cancelada | M4 |
| `/profile` (pestaña Perfil) | Perfil o invitación a entrar | M2 |
| `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Cuenta | M2 |
| `/profile/edit`, `/profile/preferences`, `/profile/favorites` | Perfil (protegidas) | M2 / M3 |
| `/welcome` | Bienvenida (primera vez y desde Perfil) | M4.5 |
| `/profile/delete-account` | Eliminar mi cuenta (protegida) | antes de M6 |
| `/account-deleted` | Eliminación solicitada (fecha) | antes de M6 |
| `/account-pending` | Cuenta pendiente de eliminación: cancelar | antes de M6 |
| `/design-system` | Catálogo del sistema de diseño | Solo desarrollo |
| `/agenda` (pestaña en modo barbería) | Agenda del día y asistencia | M7 |
| `/shop` (pestaña en modo barbería) | Mi barbería | M6 |
| `/shop/[shopId]/details`, `status`, `services`, `barbers`, `members`, `hours`, `blocks` | Gestión (protegidas, personal) | M6 |
| `/create-shop`, `/profile/invitations` | Crear barbería, invitaciones (protegidas) | M6 |

## Pendiente

- Revisión rápida, con la compilación instalada, de las correcciones de tema y contraste de M1.
- Eliminar la cuenta: no hay endpoint (pendientes de publicación #10).
- **Backend:** `GET /me/barber` (ya en el contrato; se usará en M7) (antes de los bloqueos del barbero) y el resto de `docs/api/AJUSTES-BACKEND.md`.
- Pendientes de publicación: `docs/pendientes-publicacion.md`.

## Compilación instalada y cambios nativos pendientes de compilar

**Compilación de desarrollo instalada en el teléfono del usuario:** la de M1 (commit `cbce85b`).

Cambios nativos aprobados que todavía **no están** en esa compilación. Se aplicarán en la próxima, que el usuario decide cuándo lanzar:

| Cambio | Efecto cuando se compile | Sin compilar |
|---|---|---|
| `expo-navigation-bar` y su plugin (`enforceContrast: false`) | El color de los iconos de la barra inferior de Android sigue el tema | El código lo detecta y no lo usa: la barra queda como la deja el sistema, sin errores |
| `backgroundColor` en `app.config.ts` | Fondo oscuro antes de que cargue la app (sin destello blanco) | Ya se aplica en tiempo de ejecución con `expo-system-ui` |
| Clave de Google Maps (variable de EAS `GOOGLE_MAPS_ANDROID_API_KEY`, leída por el plugin de `react-native-maps` en `app.config.ts`) | Mapa en Android. Después de instalar, poner `EXPO_PUBLIC_MAPS_ANDROID_ENABLED=true` en `.env` | La vista de mapa muestra un aviso; la lista funciona completa |
| `environment` por perfil en `eas.json` (`development`, `preview`, `production`) | EAS entrega a cada compilación las variables de su entorno (la clave de Maps) | Sin efecto |
| **Firebase (FCM) para push en Android** (aprobado para la compilación final): proyecto de Firebase del usuario, `google-services.json` como archivo de EAS (no en el repositorio) y `android.googleServicesFile` en `app.config.ts`; clave de FCM V1 subida a EAS | El teléfono obtiene su token de Expo y recibe push | `getPushToken` devuelve null: no se registra el dispositivo; la bandeja y la campana funcionan |

## Cuándo hace falta una compilación nueva (EAS)

Solo al añadir o actualizar un módulo nativo, o al cambiar `app.config.ts`, `eas.json` o `plugins/`. Los cambios de código JavaScript o TypeScript llegan con `pnpm start` sin recompilar.
