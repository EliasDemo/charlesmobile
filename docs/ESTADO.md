# Estado del proyecto

Léelo primero al empezar una conversación nueva.

**Fase actual:** compilación única lista (falta probarla en el teléfono). Hechos además: calendario mensual, emojis, español/inglés, gestos, celebración, glassmorphism, esqueletos con forma, estados inteligentes y arreglos del pago web. M5, M7–M10 pendientes de la prueba del usuario. Después: M11 (publicación).

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
  - Mapa con **MapLibre + OpenFreeMap** (OpenStreetMap; gratis, sin clave). Sin el módulo en la compilación instalada aparece un aviso con "Ver la lista".
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

## M9 — Valoraciones y soporte (código terminado; falta la prueba del usuario)

- **Ayuda** (Perfil → Ayuda, `/support`): mis consultas con su estado; nueva consulta (categoría, asunto 3–120, mensaje hasta 2000), opcionalmente ligada a una reserva ("Necesito ayuda con esta reserva" en el detalle, `/support/new?bookingId=`); conversación estilo chat (`/support/[id]`) con respuesta solo si `canReply`; `TICKET_CLOSED` ofrece abrir otra.
- **Reportar una barbería** desde su ficha (con sesión): motivo y detalles (hasta 500); `ALREADY_REPORTED` se explica.
- **Cuenta deshabilitada:** el login con `ACCOUNT_DISABLED` pide `support-access` (scope `support`, token solo en memoria) y abre `/account-disabled`, que solo muestra la ayuda con ese token.
- Avisos de la bandeja: `ticket` abre la consulta y `account` abre Ayuda.
- Pruebas: `src/features/support/__tests__`, `auth/__tests__/disabledAccount.test.tsx`.
- **Parte 2 — valoraciones** (contrato sincronizado el 2026-10-11, que trae también los campos de fotos de la Fase 14):
  - En la reserva: "Valorar esta cita" solo con `canReview`; si ya existe, "Tu valoración" con sus estrellas y "Editar" solo con `review.canEdit`.
  - Valorar (`/reviews/new?bookingId=`): estrellas 1–5 y comentario opcional de 3 a 500 (vacío no se envía). Editar una vez (`/reviews/[id]`, vacío envía `null`) o retirar con confirmación.
  - "Mis valoraciones" en Perfil (`/profile/reviews`) con su estado y la respuesta de la barbería.
  - Aviso "¿Cómo te fue con tu…?" arriba de Reservas (`GET /me/bookings/pending-reviews`, la más reciente).
  - Mi barbería → mosaico "Valoraciones" (`/shop/[shopId]/reviews`): todas, con su estado; "Responder"/"Editar respuesta" solo con `canRespond` (hasta 500); aviso si soporte ocultó la respuesta.
  - "Reportar" bajo cada valoración pública (con sesión). El aviso `NEW_REVIEW` abre las valoraciones de esa barbería.
  - Pruebas: `src/features/reviews/__tests__`.

## M4.6 — Rediseño visual (código terminado; falta la revisión del usuario con capturas)

- **Cobre renovado** (más vivo) con neutros fríos en tema claro y negro azulado en oscuro; estados más saturados. Contraste mínimo verificado por las pruebas de `shared/theme`.
- **Distancias:** margen lateral de 20 (`spacing.gutter`), radios 8/12/18/24, botones en forma de píldora con ícono opcional, tarjetas con sombra suave en tema claro y borde fino en oscuro (`useSurfaceStyle`).
- **Confirmaciones:** `ConfirmDialog` ahora es una hoja que sube desde abajo, con ícono grande. **Mensajes breves** (`showToast` + `ToastHost` en la raíz) para acciones rápidas de la agenda.
- **Íconos:** filas del perfil (`ListRow icon`), selector de días en mosaicos (día de la semana y número), `IconTile` con tono de estado.
- **Agenda:** fecha larga del día, resumen en tarjetas (citas, por marcar, atendidas), línea de tiempo con hora a la izquierda y punto de color por estado; bloqueos con borde punteado; campana también en Agenda.
- **Mi barbería:** tarjeta de cabecera (inicial, nombre, rol, tipo y estado) y secciones en cuadrícula de mosaicos con ícono y descripción (`ActionTile`/`TileGrid`); "Como barbero" también en mosaicos.
- Sin cambios nativos. La vibración al confirmar (`expo-haptics`) quedó fuera.
- **Efectos (grupo A, `shared/ui/motion.tsx`, solo `Animated` de React Native):** rebote al tocar (botones, chips, mosaicos, tarjetas, días), aparición escalonada (listas, agenda, mosaicos), mensaje breve que sube con check animado, números que cuentan en el resumen de la agenda, check al confirmar una reserva, brillo que recorre las tarjetas de carga, campana que se mueve con avisos nuevos, ícono de pestaña que rebota y fundido al cambiar de modo. Todo se apaga con "Reducir movimiento" (un solo detector: `useReduceMotion`, `syncReduceMotion`).
- **Corrección:** al abrir o recargar en modo barbería, la app iba a Explorar (ruta inicial oculta). Ahora cada modo va a su primera pestaña.

## M8 — Notificaciones (código terminado; falta la prueba del usuario)

- **Bandeja** (`/notifications`, protegida): `GET /me/notifications` con lista infinita; los no leídos con "Nuevo"; al tocar se marca leído (`POST .../{id}/read`) y abre su pantalla: `booking` → la reserva; `barbershop` y `review` → Mi barbería (modo barbería); `ticket` y `account` → la bandeja hasta M9. "Marcar todo como leído".
- **Campana** con el número de no leídos (`unread-count`, cada minuto y al volver a la app), arriba a la derecha en Explorar y en Mi barbería, solo con sesión.
- **Permiso de push:** se explica y se pide una sola vez, en la **primera reserva confirmada** (pantalla de la reserva). Si se niega, Preferencias muestra el aviso y "Abrir ajustes".
- **Registro del dispositivo** (`PUT /me/devices`, token en el cuerpo): al aceptar el permiso y al abrir la app con sesión y permiso. Sin token (Android sin Firebase) no hace nada y la bandeja funciona igual. Al cerrar sesión el backend borra el dispositivo.
- **Toque en un push:** abre su pantalla, también con la app cerrada. El push nunca trae datos sensibles.
- Pruebas: `src/features/notifications/__tests__`. `expo-notifications` simulado en `jest.setup.tsx`.
- **Push real en Android: pendiente de Firebase (FCM)** en la compilación final (ver cambios nativos pendientes). En desarrollo el backend usa `PUSH_DRIVER=fake`.

## M5 — Pagar la reserva (código terminado; el checkout necesita la compilación única)

- Contrato: `clientAction.type` = `FAKE` | `IZIPAY_WEB` | `MERCADOPAGO_WEB`; las web traen `{ paymentUrl, doneUrlPrefix }`. **Pruebas con Mercado Pago; Izipay queda oculto** para la migración futura: la app no tiene nada propio de ninguna pasarela (`shared/payments`: `checkoutFor`, `outcomeFromDoneUrl`, `WebCheckout`). El SDK nativo de Izipay se mantiene instalado (sin uso).
- "Pagar S/ …" en la reserva pendiente (`POST /bookings/{id}/payment`, idempotente; también da un enlace nuevo si venció). `FAKE`: "Esperando la confirmación" (`dev:pay`). Web: página de pago a pantalla completa (`react-native-webview`; respaldo `expo-web-browser`), se cierra al llegar a `doneUrlPrefix`.
- Resultado: success → "Confirmando tu pago…"; pending → "en proceso"; error/cancel → "no se completó" + "Reintentar el pago"; expired → recarga; cerrar a mano → como success. Siempre se vuelve a leer la reserva (cada 3 s mientras confirma): **solo `CONFIRMED` del backend confirma**. `clientAction` null → aviso para reintentar.
- Pruebas: `booking/__tests__/payment.test.tsx`, `shared/payments/__tests__`.
- **Probar con la compilación:** tarjeta de prueba Visa 4009 1753 3280 6176, CVV 123, 11/30, DNI de 8 dígitos (12345678; el campo no acepta 9); titular APRO (aprobado), OTHE (rechazado), CONT (pendiente); e-mail inventado (test_user_charles@testuser.com). Yape en pruebas queda pendiente.

## M10 — Fotos y galería (código terminado; la subida necesita la compilación única)

- **Sin compilar:** logo y portada reales (búsqueda, ficha, Mi barbería), foto, años de experiencia y especialidades de cada barbero; galería pública "Trabajos" en la ficha (destacadas primero), pantalla completa (`/barbershop/[id]/gallery`), visor con estilos, barbero, **"Reservar este estilo"** (abre la reserva con servicio y barbero) y **reportar foto** (con sesión). URLs relativas en desarrollo: `mediaUrl`.
- **Editar barbero:** años de experiencia (0–60) y hasta 5 especialidades (`GET /service-styles`, `PUT .../specialties`).
- **Con la compilación:** subir o quitar portada (16:9, cumple el requisito PHOTO de la revisión) y logo en Datos de la barbería; foto del barbero; **Galería** (mosaico en Mi barbería y "Galería" como barbero): subir con consentimiento obligatorio, descripción, hasta 3 estilos y servicio; destacar, editar, borrar; aviso de "Oculta por reportes" / "Retirada por soporte". Errores `INVALID_IMAGE`, `IMAGE_LIMIT_REACHED`, `PAYLOAD_TOO_LARGE`, `STORAGE_UNAVAILABLE`.
- **Pantalla de carga animada** al abrir (JavaScript) y vibración leve en confirmaciones (con la compilación).
- Pruebas: `gallery/__tests__`, `shop-management/__tests__/shopPhotos.test.tsx`. `mockApi` acepta cuerpos multipart.
- Pendiente para después de compilar: búsqueda por estilo, caché con `expo-image`, deslizar citas, celebración, agregar al calendario.

## Fase 13 — Crecimiento y carrera del barbero (código terminado; falta la prueba del usuario)

Contrato estable del backend (commit a4b17a4), `pnpm sync:api` del 2026-10-15. Guías: `PEDIDO-CRECIMIENTO-Y-CARRERA.md`, `PROMOCIONES.md`, `CARRERA.md`.

- **Ajustes:** varias barberías por barbero (ya listadas en "Mi barbería"), `profileId` abre el perfil de carrera, etiqueta "Destacado", avisos `conversation` y `job_application` (por `type`: recibida → barbería, actualizada → "Mis postulaciones"), 6 códigos de error nuevos.
- **Cupones:** el resumen cotiza con `POST /bookings/quote` (líneas, descuento en verde, comisión solo si > 0, "S/ 25 → S/ 20"), campo de cupón con sus motivos, `BETTER_PROMOTION` como aviso; 409 `COUPON_NOT_VALID` quita el cupón y vuelve a cotizar sin reintentar. Cambiar el cupón abre un intento nuevo (otra Idempotency-Key). Promociones activas en el perfil de la barbería.
- **Mensajes (`features/messaging`):** pestaña con insignia (`/me/conversations/unread`), lista, chat (más recientes primero, carga hacia arriba), `SYSTEM` como "Charles", retirado en cursiva gris, bloquear/desbloquear, reportar con motivo, "Enviar mensaje" en la barbería y bandeja de la barbería en modo barbería. Un aviso abre el chat buscando de qué lado es.
- **Perfil profesional (`features/career`):** crear/editar (renueva la sesión para el rol BARBER), foto, especialidades (10), portafolio con consentimiento obligatorio, "Dónde trabajo" y "Dejar esta barbería" (409 explicado), perfil público con cortes/valoraciones/videos, ranking por `offset` ("Entras al ranking con 3 valoraciones").
- **Bolsa de trabajo (`features/jobs`):** empleos con filtros, postular (403 → crear perfil), mis postulaciones y retirar; ofertas de la barbería, postulantes (preseleccionar, rechazar, contratar → barberos), "Buscar barberos" (disponibles) e "Invitar"; "Escribir" e "Invitar" en el perfil del barbero en modo barbería.
- **Mapas:** pin arrastrable en el alta, "Cómo llegar" con ruta e "Ir con Waze". Falta la clave de Maps (la carga el usuario en EAS).
- **Promociones del modo barbería (`features/promotions`):** lista con estado y canjes, crear (porcentaje o monto en soles → céntimos, servicio, días, fechas, topes, solo con cupón), editar, pausar/reanudar y cupones.
- **Anuncios (`features/ads`):** `AdSlot` en `home_banner`, `search_top`, `booking_success` y `shop_dashboard`, etiqueta "Publicidad", impresión y clic (`viewerKey` por instalación en SecureStore sin sesión), catálogo del auspiciador.
- **Videos (`features/videos`):** subir (recorte a 30 s en el selector, compresión, progreso), "Procesando…" consultando cada 4 s, fallos explicados, carrusel con póster y reproductor al tocar, borrar y reportar. Necesita la compilación nueva: hasta entonces lo dice.
- Pruebas: `promotions`, `messaging`, `career`, `jobs`, `ads`, `videos` y el cupón en `booking`. Probado contra el backend local (2026-10-15): los endpoints responden como dice la documentación.

## A la par del backend (a25c96d) y rediseño — 2026-10-22 (código terminado; falta la prueba del usuario)

- **Usuario** (`USUARIO.md`): registro con usuario y disponibilidad, inicio con usuario o correo, `@usuario` en perfil, valoraciones y mensajes; cambio cada 30 días.
- **Horarios**: resumen de la semana, plantillas, horas de una lista cada 30 min, descansos (varias ventanas), copiar a otros días. **"Aún no se puede reservar"** en el panel: publicada, horario, servicios, barberos activos y barberos sin servicios (la causa típica de "no aparecen turnos").
- **Planes** (`/plan`, `/plans`, suscripción por correo sin botón de compra, sync al volver, barberos activos, destacados, insignia Verificada) y aviso global `PLAN_LIMIT_REACHED`/`PLAN_FEATURE_NOT_INCLUDED` → "Ver mi plan".
- **Membresías**: planes en la barbería, suscribirse (pago en la app), Mis membresías, pagar con crédito, gestión y miembros.
- **Panel de negocio**: caja, venta en el local (Idempotency-Key, `CASH_SESSION_REQUIRED`, boleta con documento desde S/ 700), ventas (anular, reintentar boleta, PDF), clientes y ranking por niveles, catálogo de cortes, reportes con comisiones y CSV compartido, boletas (token enviado al servidor, no se guarda).
- **Forma de cara**: consentimiento, selfie medida en el teléfono (ML Kit, solo 4 medidas), recomendaciones con fotos y barberos cerca, recordar la forma con consentimiento, medidas al subir fotos a galería y portafolio.
- **Bolsa laboral**: selector de distrito (lista fija Perú), "Barberos disponibles" por distrito → provincia → Perú con podio, oferta en 3 pasos (pago, conversable, requisitos, proceso; dentro de `compensationText`/`description` mientras el backend no tenga campos) con vista previa, filtros compactos.
- **Diseño**: panel de la barbería con "Hoy" y secciones agrupadas; chat con burbujas, días y barra con botón circular; bienvenida nueva (degradados, paralaje, elegir cómo usar Charles); recorrido guiado; Ajustes (sonidos, vibración, tutorial, permisos, versión); sonidos propios generados (`assets/sounds`); espacio reservado del mapa.
- **Diferencias a reportar al backend:** `NotificationResourceDto.type` no incluye `subscription` ni `membership` (la app usa el `type` del aviso). Pedido pendiente: distrito/provincia y cercanía en ranking y empleos, campos de pago y requisitos en ofertas, oferta directa, `readiness`.

## Comunidad y cuenta bajo demanda — 2026-10-22

- **Hecho (sin compilar):** hoja "Crea tu cuenta / Inicia sesión" (`askForAccount` + `AuthPromptHost` en `shared/ui`) al reservar, escribir, guardar favorita, postular o suscribirse; vuelve a la pantalla de origen. Al reservar, cada barbero muestra foto, estrellas, "Ver perfil y reseñas" (`profileId`) y "Mejor valorado" (mayor promedio de la API con 3+ valoraciones; solo resalta).
- **Comunidad conectada (2026-10-27, contrato `docs/api/COMUNIDAD.md`):** pestaña **Comunidad** (entre Explorar y Reservas, en los dos modos) con Para ti · Cerca · Siguiendo, filtros por tipo y "Publicar" para quien tiene barbería o perfil profesional; detalle público `/community/[id]` con comentarios; `/community/saved` y `/community/new` (protegidas). Interactuar sin sesión abre "Crea tu cuenta". El autor lleva a su barbería o a su perfil profesional; "Reservar" abre la reserva en esa barbería. Falta la prueba en el teléfono.
- **Comunidad, diseño y teclado (2026-10-27):** estilo de feed social (referencia Instagram/Threads): pestañas subrayadas, una fila de filtros con icono de borde a borde, tarjeta con "⋯" en la cabecera, fotos al ancho real (antes se salían 8 px por lado: el cálculo ignoraba el margen de la lista), iconos con su número y Guardar a la derecha. `KeyboardAvoider` y `MessageBar` nuevos en `shared/ui`: en Android (edge-to-edge) el campo de comentar y el del chat suben con el teclado también sin `react-native-keyboard-controller`.
- **Revisión de robustez (2026-10-27):** cuadrícula de cortes del perfil profesional medida por su ancho real (se desbordaba dentro de tarjetas); barra "Tu camino al ranking" con tope de 100 %; iniciales con emoji sin símbolos rotos y "?" para nombres vacíos; límite por defecto en `TextField` (255 / 2000) y `SearchField` (100) contra pegados enormes; campos de varias líneas con altura máxima; `ListRow`, `StatusPill`, `Badge` e `InfoCard` recortan textos largos en vez de deformar la fila; créditos de membresía y cupo del evento solo enteros positivos; la comisión inválida ya no cierra el editor como si hubiera guardado; `ConfirmDialog` y la hoja de la galería del local suben con el teclado en Android. Se probó y descartó un bloqueo global de doble toque en `Button` (frenaba "Siguiente" rápido en asistentes); los envíos ya se bloquean con `loading`.
- **Mapa mejorado (2026-10-27, solo JavaScript):** al abrir centra en la persona si ya dio permiso (sin diálogo); si no, encuadra los resultados; Lima solo como último recurso. Botón redondo "Mi ubicación" (con la explicación previa de "Cerca de mí"), punto con dirección, "Ver todas las barberías" (encuadre), y al tocar un pin: tarjeta con "Cómo llegar" (Google Maps / Apple Maps) y Waze; tocar el mapa la cierra. `BrandMap` expone `flyTo` y `fit`. En el alta, el mapa sigue al pin cuando se usa "Usar mi ubicación" (antes quedaba en Lima).
- **Mapa, diseño (2026-10-27):** pines en forma de gota con el logo (o tijeras), borde y sombra, y la distancia de la API debajo ("850 m"); los que se enciman se agrupan en un círculo con el número (`mapClusters.ts`, por píxeles en Web Mercator según el zoom) y al tocarlo se acerca; personita con halo donde está la persona; botones + / −; carrusel inferior de barberías (foto, distancia, estrellas, abierta/cerrada) que mueve el mapa al deslizar; el mapa recorta los pines en su borde.
- **Perfil reordenado (2026-10-27):** cabecera de marca (foto grande con aro cobre, nombre, @usuario, correo, "Editar perfil"); "Lo tuyo" en cuadrícula (Favoritas, Mis reseñas, Membresías, Avisos); "Para profesionales" con botón destacado para cambiar de modo, o invitación a crear la barbería si no tiene; Cuenta, Ayuda y Sesión en tarjetas; "Eliminar mi cuenta" aparte; versión de la app al final.
- **Rediseño general (2026-10-27):** detalle de barbería (portada a todo el ancho con logo, accesos redondos, horario plegable, barberos en carrusel, "Reservar" fijo abajo); reservar en 4 pasos numerados con servicios como tarjetas y horarios en cuadrícula; resumen tipo ticket; "Tu próxima cita" destacada en Mis reservas; detalle de reserva con cabecera de marca; agenda con línea "Ahora" y "Siguiente cita"; panel de barbería con cabecera de marca y secciones como atajos de 3 por fila; perfil profesional tipo portafolio con cifras.
- **Lista de espera (2026-10-27, contrato `docs/api/LISTA-ESPERA.md`):** `features/waitlist`; las fechas y franjas se muestran en la zona de cada barbería (`timezone` del contrato). En un día sin turnos, "Avisarme si se libera un turno" (franja: todo el día, mañana, tarde o noche; ese barbero o cualquiera; 409 = límite de 5 explicado). "Mis listas de espera" en Perfil (`/profile/waitlist`): esperando / "¡Se liberó un turno!" con "Reservar ahora", y salir con confirmación. El aviso `WAITLIST_SLOT_FREED` abre la barbería en modo cliente.
- **Antes (pedido al backend):** pestaña **Comunidad** (Explorar · Comunidad · Reservas · Mensajes · Perfil): publicaciones de barberías y barberos (promoción, evento, trabajo, aviso), feed Para ti / Cerca / Siguiendo, me gusta, comentarios con respuestas, compartir, guardar, seguir, eventos, reportar y bloquear (obligatorio para las tiendas), y me gusta y foto del autor en las valoraciones. Pedido completo enviado al usuario el 2026-10-22. Los clientes solo interactúan al inicio (pendiente de confirmar).
- Enlaces universales para abrir publicaciones compartidas: cambio nativo, pendiente de aprobación.

- **Barbero (2026-10-22):** "Mi barbería" muestra la **bolsa laboral** primero al barbero sin barbería (ofertas de su distrito, postulaciones, perfil) y discreta al que ya trabaja; el dueño no la ve. **Mensajes** separados en Social · Profesional (solo si hay de ambos), con quién responde (dueño o administrador) y "Ver perfil profesional" en lo laboral. **Ranking sin desmotivar:** el perfil propio muestra "Tu camino al ranking" (0/3) y pasos para destacar; "Nuevo talento" en vez de "fuera del ranking"; celebración al entrar.

- **Tutorial, teclado y diseño (2026-10-22):**
  - El tutorial mide cada paso al mostrarlo, omite lo que no está a la vista y pone el globo al costado con una flecha.
  - Hojas de "Desbloqueaste…" al pasar a modo barbería (dueño o barbero), al crear la barbería y al activar un plan pagado (lo que incluye el plan, según la API).
  - El teclado ya no tapa campos: `Screen` deja espacio y desplaza hasta el campo activo; login y registro tienen "Siguiente" entre campos.
  - Paleta azul marino y cobre con fondos crema, titulares en Playfair Display, ilustraciones de marca en los estados vacío y error, estado sin conexión propio, cabecera de marca en login y registro, y bienvenida con titulares en dos tonos y marco en arco.
- **Pendiente para la compilación única:** `react-native-keyboard-controller` (aprobado el 2026-10-22) y el logo (ícono adaptativo, splash, ícono de notificaciones).

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
| `/community` (pestaña), `/community/[id]` | Comunidad y publicación (públicas) | Comunidad |
| `/community/saved`, `/community/new` | Guardadas y nueva publicación (protegidas) | Comunidad |
| `/profile/waitlist` | Mis listas de espera (protegida) | Lista de espera |

## Pendiente

- Revisión rápida, con la compilación instalada, de las correcciones de tema y contraste de M1.
- Eliminar la cuenta: no hay endpoint (pendientes de publicación #10).
- **Backend:** `GET /me/barber` (ya en el contrato; se usará en M7) (antes de los bloqueos del barbero) y el resto de `docs/api/AJUSTES-BACKEND.md`.
- Pendientes de publicación: `docs/pendientes-publicacion.md`.
- **Pago con Mercado Pago (2026-10-12):** con la compilación nueva el formulario se llena bien (el teclado ya no tapa los campos), pero Mercado Pago responde "No pudimos procesar tu pago" con APRO. Causa (revisado en el backend con permiso): el vendedor es de prueba (`3760410520`) y solo acepta compradores de prueba con sesión iniciada; como invitado se rechaza antes de crear el pago. En el WebView Mercado Pago oculta "Ingresar con mi cuenta": el pago tiene un botón fijo "Abrir en el navegador" para iniciar sesión ahí.
- **Subir fotos (2026-10-12):** el `fetch` de Expo (global por defecto) no envía archivos `{ uri }` en FormData y la subida fallaba como "sin conexión". Las peticiones multipart van por `XMLHttpRequest` de React Native (`shared/api/uploadFetch.ts`); el resto sigue con `fetch`. Probado contra el backend con curl: logo, portada y galería responden 200.
- **Perfil completo (2026-10-12, contrato `PERFIL.md`):** foto de la cuenta (`PUT/DELETE /users/me/photo`, recorte cuadrado), fecha de nacimiento (DD/MM/AAAA → ISO; la edad mínima la valida el backend) y género opcionales con aviso de privacidad, cambio de contraseña (`POST /users/me/password`, `WRONG_PASSWORD` sin cerrar sesión) y foto del cliente en la agenda (`client.photoUrl`). Falta la prueba en el teléfono.

## Compilación instalada y cambios nativos pendientes de compilar

**Compilación de desarrollo:** la del 2026-10-23 (EAS build 553aac03: identidad visual Charles —ícono, splash, notificaciones— y `react-native-keyboard-controller`). Antes, 2026-10-22 (EAS build 1a6bdc32: audio, sonido de notificaciones, detector de rostro, videos y expo-asset). La anterior, 2026-10-12 (EAS build 93f04a0d), con todos los módulos de la compilación única **salvo la clave de Google Maps y Firebase** (no había variables en EAS): mapa y push reales quedan para una compilación siguiente cuando se carguen. La anterior era la de M1 (commit `cbce85b`).

Cambios nativos aprobados que todavía **no están** en esa compilación. Se aplicarán en la próxima, que el usuario decide cuándo lanzar:

| Cambio | Efecto cuando se compile | Sin compilar |
|---|---|---|
| `expo-navigation-bar` y su plugin (`enforceContrast: false`) | El color de los iconos de la barra inferior de Android sigue el tema | El código lo detecta y no lo usa: la barra queda como la deja el sistema, sin errores |
| `backgroundColor` en `app.config.ts` | Fondo oscuro antes de que cargue la app (sin destello blanco) | Ya se aplica en tiempo de ejecución con `expo-system-ui` |
| **Mapa: `@maplibre/maplibre-react-native` 11.5.0** (aprobado el 2026-10-27; MIT, organización MapLibre, sin scripts de instalación) con teselas de **OpenFreeMap** (OpenStreetMap: sin clave, sin registro, sin límite, uso comercial permitido; crédito visible en el mapa). Reemplaza a `react-native-maps` y a la clave de Google | Mapa de Explorar con pines de la marca y "Buscar en esta zona"; pin del local en el alta | `mapAvailable()` es false: aviso con "Ver la lista" y espacio reservado en el alta |
| `environment` por perfil en `eas.json` (`development`, `preview`, `production`) | EAS entrega a cada compilación las variables de su entorno (la clave de Maps) | Sin efecto |
| **Firebase (FCM) para push en Android** (aprobado para la compilación final): proyecto de Firebase del usuario, `google-services.json` como archivo de EAS (no en el repositorio) y `android.googleServicesFile` en `app.config.ts`; clave de FCM V1 subida a EAS | El teléfono obtiene su token de Expo y recibe push | `getPushToken` devuelve null: no se registra el dispositivo; la bandeja y la campana funcionan |
| **Fotos** (M10): `expo-image-picker` (plugin con permisos de fotos y cámara), `expo-image-manipulator` (2000 px y JPEG; convierte HEIC) | Subir portada, logo, foto del barbero y galería | `photosAvailable()` es false: las pantallas explican que llega con la próxima versión |
| `react-native-webview` (M5) | Página de pago dentro de la app | El botón Pagar abre el pago con `expo-web-browser` si existiera; sin ninguno, avisa |
| `expo-haptics` | Vibración leve al confirmar y en los mensajes breves (`haptic()`) | No vibra |
| Instalados para usar **después de compilar** (aprobados el 2026-10-11 como "compilación única"): `expo-image` (caché de fotos), `react-native-reanimated` 4 + `react-native-worklets` + `react-native-gesture-handler` (deslizar citas), `lottie-react-native` (celebración), `expo-blur`, `expo-linear-gradient`, `expo-calendar` (plugin: agregar la cita al calendario), `expo-web-browser` (plugin), `expo-clipboard`, `expo-store-review`, `expo-updates` (`runtimeVersion` = versión de la app; activo fuera de desarrollo), `react-native-ssl-public-key-pinning` (M11), `@sentry/react-native` (M11, apagado) | Cada función se conecta y se prueba con la compilación instalada | **No se importan todavía** en el código (salvo los protegidos): la app actual no los necesita |
| **Videos (Fase 13, aprobado el 2026-10-12):** `expo-video` 57.0.5 (reproducir) y `react-native-compressor` 2.0.3 (comprimir antes de subir); el recorte a 30 s lo limita `expo-image-picker` (`videoMaxDuration`) | Subir y ver videos de 30 s | **No se importan todavía**: la sección de videos se hará con carga opcional del módulo |
| `react-native-nitro-modules` 0.37.1 (lo necesita `react-native-compressor`) | Comprimir videos | `videoUploadAvailable()` es false: la pantalla lo explica |
| `expo-audio` 57.0.5 y sonido de notificación (`expo-notifications` con `sounds`, canales Reservas, Mensajes, Pagos, Promociones) | Sonidos en la app y aviso con sonido propio | Silencio; canales con el sonido por defecto |
| `@react-native-ml-kit/face-detection` 2.0.1 (sin dependencias ni scripts, MIT) | Forma de cara en el teléfono | La pantalla explica que llega con la próxima versión |
| Colores de la pantalla de carga nativa (`#F4F6F8` / `#0D1015`) y `backgroundColor` | Splash con la paleta nueva | Ya se ve la pantalla de carga animada en JavaScript |
| **Identidad visual Charles (2026-10-22):** ícono, ícono adaptativo de Android (emblema sobre azul marino `#18264A`), monocromo, splash nativo azul marino con el emblema, ícono y color de notificaciones (`expo-notifications`: `icon`, `color #C88B52`) | Ícono y pantalla de carga con la marca; notificaciones con la silueta | La pantalla de carga animada (JavaScript) y el login ya muestran el emblema |
| `react-native-keyboard-controller` 1.21.9 (aprobado el 2026-10-22) | `KeyboardProvider` y `KeyboardAwareScrollView` en `Screen`: el campo activo siempre visible | `keyboardController()` es null: `Screen` deja espacio y desplaza a mano |

### Guía de la compilación única (la lanza el usuario)

1. **Firebase:** crear un proyecto en console.firebase.google.com → agregar app Android con paquete `pe.charlesapp.mobile.dev` → descargar `google-services.json` (no al repositorio). En "Configuración del proyecto → Cuentas de servicio" generar una clave privada (JSON) para FCM V1.
2. **Variables de EAS** (expo.dev → proyecto charles → Environment variables, entorno `development`):
   - `GOOGLE_SERVICES_JSON` como **archivo** (`google-services.json`).
3. **Credenciales de push:** `eas credentials -p android` → perfil development → Google Service Account → subir la clave FCM V1.
4. Compilar: `eas build --profile development --platform android` e instalar el APK.
5. `pnpm start`.

## Cuándo hace falta una compilación nueva (EAS)

Solo al añadir o actualizar un módulo nativo, o al cambiar `app.config.ts`, `eas.json` o `plugins/`. Los cambios de código JavaScript o TypeScript llegan con `pnpm start` sin recompilar.
