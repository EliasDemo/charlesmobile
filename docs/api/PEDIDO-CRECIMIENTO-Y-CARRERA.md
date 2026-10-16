# Pedido para la app móvil: Fase 13, Carrera del barbero, mapas y pagos

Para quien construye charlesmobile. Cada sección dice **qué pantalla**, **qué endpoints**, **qué mostrar** y **cuándo está terminada**. El detalle de campos y errores está en `PROMOCIONES.md`, `CARRERA.md` y `GUIA-API.md`.

> Empieza con `pnpm sync:api` **cuando el backend avise que el contrato está estable**. No inventes campos: si algo no está en `openapi.json`, pregunta.

## 0. Ajustes a pantallas que ya existen (primero)

| Cambio                                        | Qué hacer                                                                                                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un barbero puede trabajar en varias barberías | En "Mis perfiles de barbero" (`GET /me/barber`), lista todas sus barberías; el selector de barbería del modo barbero ya no asume una sola. `BARBER_ALREADY_ACTIVE_ELSEWHERE` ahora es "Ya trabajas en esta barbería". |
| `profileId` en los barberos de una barbería   | En el perfil de la barbería, al tocar un barbero con `profileId`, abre su **perfil de carrera** (sección 3). Si es null, muestra solo lo actual.                                                                      |
| `featured: true` en la búsqueda               | Etiqueta "Destacado" en la tarjeta del resultado.                                                                                                                                                                     |
| Avisos nuevos                                 | En la bandeja de avisos, `resource.type`: `conversation` → abre el chat (sección 4); `job_application` → abre la postulación (sección 5).                                                                             |
| Errores nuevos                                | Agrega a tu tabla de mensajes: `COUPON_NOT_VALID`, `COUPON_CODE_TAKEN`, `CONVERSATION_BLOCKED`, `ALREADY_APPLIED`, `JOB_POSTING_CLOSED`, `VIDEO_LIMIT_REACHED` (textos en `GUIA-API.md`).                             |

**Terminado cuando:** la app compila con los tipos nuevos y las pantallas actuales siguen funcionando.

## 1. Cupones y precio con descuento (cliente)

**Pantalla "Confirmar reserva"** (antes de pagar):

1. Al entrar, `POST /bookings/quote` con `barbershopId`, `serviceId`, `startAt`. Muestra las líneas: servicio, descuento (en verde, restando), comisión si es mayor que 0, y **total**. Si hay `promotion`, muestra su nombre ("20 % los martes").
2. Campo **"¿Tienes un cupón?"** + botón "Aplicar": repite la cotización con `couponCode`. Según `coupon.reason`:
   - `null` → "Cupón aplicado" ✔.
   - `BETTER_PROMOTION` → "Ya tienes un descuento mejor; solo se aplica uno por reserva".
   - `NOT_FOUND`, `NOT_ACTIVE`, `NOT_APPLICABLE`, `EXHAUSTED`, `ALREADY_USED` → mensaje de la tabla de `PROMOCIONES.md`, debajo del campo.
3. "Reservar y pagar": `POST /bookings` con el mismo `couponCode` (solo si quedó aplicado). Si responde **409 `COUPON_NOT_VALID`**, muestra el motivo, quita el cupón y vuelve a cotizar (no reintentes solo).
4. En el detalle de la reserva, muestra el `price.lines` guardado (incluida la línea `DISCOUNT`).

**Perfil de la barbería:** sección "Promociones" con `GET /barbershops/{id}/promotions/active`: nombre, valor ("20 %" o "S/ 5"), días ("Martes y jueves" desde `daysOfWeek`), servicio si aplica a uno, vence el… Si `fromCharles`, etiqueta "Charles".

**Terminado cuando:** con un cupón de prueba el total baja en la cotización y en la reserva, y los errores se ven en español.

## 2. Promociones de mi barbería (modo barbería: OWNER o MANAGER)

**Pantalla "Promociones"** (menú del modo barbería):

- Lista `GET /barbershops/{id}/promotions`: nombre, valor, estado (`ACTIVE` vigente, `SCHEDULED` programada, `PAUSED`, `ENDED`, `EXHAUSTED` sin cupos), canjes (`redemptions` de `maxRedemptions`), total descontado y cupones con sus usos.
- **Crear** (`POST`): nombre; tipo (porcentaje 1–100 o monto fijo S/ 1–500 → envía céntimos); "solo para el servicio…" (`serviceId`, opcional); inicio y fin (opcionales); usos totales y por cliente (opcionales); días de la semana (chips Dom…Sáb → `daysOfWeek` 0–6); interruptor "Solo con cupón" (`requiresCoupon`).
- **Editar** (`PATCH`): nombre, fin, topes y **Pausar/Reanudar** (`isActive`). El tipo y el valor no se editan: explica "crea otra".
- **Cupones** (si `requiresCoupon`): agregar código (4–20 letras o números, se guarda en mayúsculas; 409 `COUPON_CODE_TAKEN` → "Ese código ya existe") y retirar.
- Texto fijo: "El descuento lo asume tu barbería".

## 3. Perfil profesional del barbero

### 3.1 Mi perfil (modo barbero, o cualquier cuenta que quiera ser barbero)

- Entrada: en "Perfil", botón **"Mi perfil profesional"**. `GET /me/barber-profile`; si es **404**, muestra "Crea tu perfil profesional" → formulario.
- Formulario (`PUT /me/barber-profile`): nombre profesional (obligatorio), titular, bio, años de experiencia, distrito, interruptor **"Disponible para trabajar"**. Tras crearlo: `POST /auth/refresh` (ya tiene rol BARBER).
- Foto: `PUT /me/barber-profile/photo` (multipart `file`, mismas reglas que las demás fotos).
- Especialidades: selector de estilos (`GET /service-styles`), máximo 10 → `PUT /me/barber-profile/specialties`.
- **Mi portafolio:** grilla con `GET /barber-profiles/{miId}/portfolio`; "Agregar corte": foto + leyenda + estilos (hasta 5) + **casilla obligatoria** "La persona aceptó que se publique" → `POST /me/barber-profile/portfolio` con `consent=true`. Borrar con `DELETE /me/barber-profile/portfolio/{imageId}`.
- **Dónde trabajo:** de `workplaces` (actuales y pasadas). En las actuales, "Dejar esta barbería" con confirmación → `POST /me/barber-profile/workplaces/{barberId}/leave`. 409 `HAS_FUTURE_BOOKINGS` → "Tienes reservas pendientes ahí: atiéndelas o pide que las reasignen". Explica: "Tus valoraciones, cortes y ranking se quedan contigo".
- Muestra su puesto (`rank`, o "Entras al ranking con 3 valoraciones"), promedio, valoraciones y atenciones.

### 3.2 Perfil público de un barbero (cualquiera)

`GET /barber-profiles/{id}`: foto, nombre, titular, distrito, años, especialidades, **puesto en el ranking**, estrellas, atenciones, "Trabaja en" (enlaces a esas barberías). Pestañas: **Cortes** (`/portfolio`, filtro por estilo), **Valoraciones** (`/reviews`), **Videos** (`/videos`). Para dueños y encargados: botones "Escribir" (sección 4) e "Invitar a mi barbería" (sección 5).

### 3.3 Ranking

Pantalla "Barberos" (desde inicio o búsqueda): `GET /barbers/ranking` con filtros especialidad, distrito, nombre. Tarjeta: puesto, foto, nombre, estrellas (n.º), atenciones, especialidades, dónde trabaja. Paginación con `offset` → `nextOffset`. Los que tienen `rank: null` van al final con la etiqueta "Nuevo".

## 4. Mensajes (correo interno)

- **Pestaña "Mensajes"** con insignia (`GET /me/conversations/unread`, al abrir la app y al volver de segundo plano; también al llegar un push `NEW_MESSAGE`).
- **Lista** `GET /me/conversations`: logo y nombre de la barbería, vista previa, hora, no leídos, candado si está bloqueada.
- **Chat** `GET /me/conversations/{id}/messages` (más recientes primero; pide más con `nextCursor` al subir). Enviar `POST …/messages` (máx. 2000 caracteres). Mensajes `SYSTEM` centrados y en otro estilo ("Charles"). `removed: true` → texto gris en cursiva.
- Menú del chat: **Bloquear / Desbloquear** (solo quien bloqueó). Mantener presionado un mensaje recibido → **Reportar** (motivo: spam, acoso, inapropiado, estafa, otro). 409 `CONVERSATION_BLOCKED` → deshabilita el campo de texto.
- **Iniciar:** en el perfil de la barbería, botón "Enviar mensaje" → `POST /me/conversations { barbershopId, body }`. Un barbero que escribe por trabajo envía `kind: "PROFESSIONAL"`.
- **Modo barbería:** misma interfaz con `/barbershops/{id}/conversations…`; desde el perfil de un barbero, "Escribir" → `POST /barbershops/{id}/conversations { barberProfileId, body }`. No hay botón para escribir primero a clientes.
- Límite: 30 mensajes por minuto (429: "Espera un momento").

**Terminado cuando:** cliente y barbería conversan, llegan los push, la insignia baja al leer y bloquear funciona.

## 5. Bolsa de trabajo

### Barbero

- Pantalla **"Empleos"**: `GET /jobs` con filtros especialidad, tipo (`FULL_TIME` Tiempo completo, `PART_TIME` Medio tiempo, `WEEKENDS` Fines de semana, `COMMISSION` Por comisión, `FREELANCE` Independiente) y zona (`area`). Tarjeta: barbería (logo, nombre, dirección, estrellas), título, tipo, pago, especialidades, cierre.
- Detalle `GET /jobs/{id}` + **"Postular"** con mensaje opcional → `POST /jobs/{id}/applications`. Sin perfil: 403 → lleva a crear el perfil. 409 `ALREADY_APPLIED` / `JOB_POSTING_CLOSED` → mensaje. Si `myApplicationStatus` no es null, muestra el estado en lugar del botón.
- **"Mis postulaciones"** (`GET /me/job-applications`): estado con color (Enviada, Preseleccionado, No seleccionado, ¡Contratado!, Retirada) y "Retirar" mientras esté Enviada o Preseleccionado.

### Barbería

- **"Ofertas de trabajo"**: lista y crear/editar (`/barbershops/{id}/jobs`): título, descripción, tipo, pago (texto), especialidades, fecha de cierre; cerrar/reabrir.
- **Postulantes** de cada oferta: foto, nombre, estrellas, años, mensaje; tocar → perfil público. Botones **Preseleccionar**, **Rechazar**, **Contratar** (`POST /barbershops/{id}/job-applications/{appId}/decision`). Tras **Contratar**: "Ya está en tu equipo. Asígnale servicios y horario" → lleva a la pantalla del barbero.
- **"Buscar barberos"**: ranking con `availableForWork=true` + **"Invitar"** → `POST /barbershops/{id}/barber-invitations { barberProfileId, message? }` (le llega el código por correo y un mensaje).

## 6. Videos de 30 segundos

- **Subir:** en "Mi perfil profesional" (`POST /me/barber-profile/videos`, máx. 10) y en el modo barbería, "Videos del local" (`POST /barbershops/{id}/videos`, máx. 5). Selector de video con **recorte a 30 s** y compresión en la app antes de subir (máx. 50 MB). Barra de progreso de subida.
- La respuesta es **202 `PROCESSING`**: muestra "Procesando…" y consulta la lista de gestión (`/me/barber-profile/videos` o `/barbershops/{id}/videos/manage`) cada 3–5 s hasta `READY` o `FAILED` (`TOO_LONG` "Dura más de 30 segundos", `NOT_A_VIDEO`, `TOO_LARGE`, `PROCESSING_FAILED` "Inténtalo de nuevo").
- **Ver:** en el perfil de la barbería y del barbero, carrusel con `posterUrl`; reproduce `videoUrl` al tocar (no autoplay con sonido). Borrar (`DELETE /videos/{id}`) y reportar (`POST /videos/{id}/report`).
- 409 `VIDEO_LIMIT_REACHED` → "Borra un video para subir otro".

## 7. Anuncios de auspiciadores

- Componente `<AdSlot slot="…">` que hace `GET /placements?slot=…` y no muestra nada si viene vacío. Ubicación: `home_banner` (inicio del cliente), `search_top` (arriba de resultados), `booking_success` (tras reservar), `shop_dashboard` (inicio del modo barbería).
- Muestra imagen, título y la etiqueta **"Publicidad"**. Al hacerse visible: `POST /placements/{id}/events { type: "IMPRESSION" }`; al tocar: `CLICK` y abre `actionUrl` en el navegador.
- Sin sesión, envía `viewerKey`: un UUID que la app genera una vez y guarda en almacenamiento seguro.
- Logo del auspiciador → pantalla de catálogo `GET /sponsors/{id}` (productos con precio en texto y "Ver en la tienda" → `actionUrl` externo).

## 8. Mapas

- Librería `react-native-maps` (Apple Maps en iPhone; Google Maps en Android). La **API key de Maps SDK for Android** la entrega el equipo; va en `app.json` → `android.config.googleMaps.apiKey` (por variable de entorno de EAS, no en un repositorio público). Requiere build de desarrollo.
- **Búsqueda:** botón "Ver en mapa" con pines (`latitude`, `longitude` de cada resultado); al tocar un pin, tarjeta con la barbería. Centra en la ubicación del cliente (con permiso) o en Lima.
- **Alta de barbería:** paso "Ubicación" con mapa y **pin arrastrable** (sin geocodificar direcciones: se cobra). Envía la lat/lng del pin.
- **"Cómo llegar"** en el perfil de la barbería: abre `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` (o Waze `https://waze.com/ul?ll=LAT,LNG&navigate=yes`). Sin API.

## 9. Pagos (Mercado Pago)

- Sin cambios de contrato: `paymentUrl` en el WebView y se cierra al llegar a `doneUrlPrefix`; luego consulta la reserva hasta `CONFIRMED`.
- Pendiente del arreglo anterior: `react-native-webview` con **import estático** (no `require` dentro del componente).
- Para probar: paga con el **comprador de prueba** (nunca con el vendedor) o como invitado con un correo inventado, tarjeta de prueba con titular `APRO`.

## Orden de trabajo sugerido

0 → 1 → 4 → 3 → 5 → 8 → 2 → 7 → 6. Al terminar cada sección, prueba contra el backend local (`GUIA-API.md` §1) y avisa qué falta o qué no coincide con la documentación.
