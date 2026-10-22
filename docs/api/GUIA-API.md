# Guía de la API de Charles para la app móvil

Para quien construye la app (React Native + Expo) en `../charlesmobile`. Describe el backend tal como está hoy, **al cierre de la Fase 9**. El contrato exacto (rutas, cuerpos y respuestas) está en [`openapi.json`](openapi.json), en esta misma carpeta. Si algo de esta guía no coincide con el OpenAPI, manda el OpenAPI. Avísalo para corregir la guía.

**Regenerar `openapi.json`** (desde la carpeta del backend, `charles/`):

```bash
pnpm mobile:openapi
```

Compila la API, exporta el OpenAPI a `apps/api/openapi.json` y lo copia a `docs/mobile/openapi.json`. Sirve para generar los tipos de la app, por ejemplo con `openapi-typescript`.

Documentos relacionados: [`PAGOS.md`](PAGOS.md) (pagos hoy y con Izipay), [`DATOS-PRUEBA.md`](DATOS-PRUEBA.md) (usuarios y barberías del seed) y [`AJUSTES-BACKEND.md`](AJUSTES-BACKEND.md) (lo que el backend aún debería ajustar para la app) e [`IMAGENES.md`](IMAGENES.md) (subir y mostrar fotos).

---

## 1. Levantar el backend en local

Requisitos: Node 24, pnpm 10 y Docker. Desde la carpeta del backend (`charles/`):

```bash
pnpm install
docker compose up -d                      # PostgreSQL 16 + PostGIS (5432), Redis 7 (6379) e imágenes S3 (9000)
# apps/api/.env no se versiona: pídeselo a quien mantiene el backend o créalo desde
# apps/api/.env.example (las claves de cifrado y de JWT se generan; no se comparten).
pnpm --filter api prisma migrate deploy
pnpm --filter api seed:reference          # categorías y estilos de servicio
pnpm --filter api prisma db seed          # usuarios y barberías de prueba (DATOS-PRUEBA.md)
pnpm --filter api start:dev
```

- **API:** `http://localhost:3000/api/v1`. Todas las rutas empiezan con `/api/v1`.
- **Estado:** `GET http://localhost:3000/api/v1/health`.
- **Swagger** (si `SWAGGER_ENABLED=true` en `apps/api/.env`): `http://localhost:3000/api/docs`.

### Acceder desde un teléfono en la misma red wifi

1. **IP local del computador:** búscala con `ipconfig` en Windows (dirección IPv4 del adaptador wifi, por ejemplo `192.168.1.50`) o con `ip addr` / `ifconfig` en Linux o macOS.
2. **URL en la app:** `http://192.168.1.50:3000/api/v1`. El servidor escucha en todas las interfaces, no solo en `localhost`.
3. **Firewall de Windows:** permite conexiones entrantes al puerto 3000 en redes privadas (Windows suele preguntarlo la primera vez que Node escucha).
4. **`CORS_ORIGINS`:**
   - **App nativa en el teléfono:** **no hace falta cambiarla.** CORS solo lo aplica el navegador, y una app nativa no envía la cabecera `Origin`.
   - **Expo para web o navegador del teléfono:** agrega ese origen exacto, por ejemplo `CORS_ORIGINS=http://localhost:3001,http://192.168.1.50:8081`. No se permiten comodines.
5. **`TRUST_PROXY`:** con el teléfono conectado directo al computador, déjala como está (`loopback`). El límite de peticiones usa la IP real del teléfono. Solo cambia si pones un proxy o un túnel delante: entonces indica la IP de ese proxy, nunca `true`.
6. **HTTP es válido en desarrollo:** la API solo exige HTTPS con `NODE_ENV=production`.
   - **Android:** bloquea HTTP plano por defecto. Para desarrollo, habilita el tráfico sin cifrar solo en la compilación de desarrollo, con `usesCleartextTraffic` en el `app.json` de Expo o una _network security config_.
   - **iOS:** necesita una excepción de ATS para la IP local, también solo en desarrollo.
7. **Alternativa:** un túnel HTTPS (por ejemplo `cloudflared` o `ngrok`). En ese caso, configura `TRUST_PROXY` con la IP del túnel local (`loopback` suele bastar).

**Correos en desarrollo.** No se envían correos reales: el backend usa `FakeMailer`, que guarda los últimos 200 mensajes en Redis durante una hora. Para leer el código de verificación o de recuperación de un destinatario:

```bash
pnpm --filter api dev:mail <correo>
```

Solo funciona fuera de producción y con el correo simulado; cada lectura queda auditada (sin el correo).

---

## 2. Autenticación

### Tokens

| Token                       | Formato   | Duración                                                    | Dónde guardarlo                                                      |
| --------------------------- | --------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Acceso (`accessToken`)      | JWT ES256 | **15 minutos** (`accessTokenExpiresAt`)                     | En memoria                                                           |
| Renovación (`refreshToken`) | Opaco     | **30 días**, renovados con el uso (`refreshTokenExpiresAt`) | Almacenamiento seguro (`expo-secure-store`); nunca en `AsyncStorage` |

Cabecera en cada petición autenticada: `Authorization: Bearer <accessToken>`.

### Flujo

1. **Términos:** `GET /auth/terms` devuelve la versión vigente.
2. **Registro:** `POST /auth/register` con `{ username, fullName, email, password, phone?, acceptTerms: true, declaresAdult: true, termsVersion }`.
   - `username` (obligatorio): 3 a 20 caracteres; minúsculas, números, punto y guion bajo; sin empezar ni terminar en punto o guion bajo y sin dos seguidos. Se guarda en minúsculas. Es **público**: es lo que otras personas ven en lugar del nombre real.
   - Para validar mientras se escribe: `GET /auth/username-available?username=…` → `{ available, reason }` con `reason` `INVALID`, `RESERVED`, `TAKEN` o `null`.
   - Usuario ocupado: 409 `USERNAME_TAKEN`. Formato inválido: 400 `VALIDATION_ERROR` en `username`; reservado (contiene "charles", "admin", "soporte"…): 400 con `constraints: ["usernameReserved"]`.
   - `fullName` es el nombre real: solo lo ven la propia persona, la barbería (únicamente el nombre de pila) y el personal.
   - Responde **202** siempre, exista o no el correo, para no revelar cuentas (ADR 0003).
   - La contraseña tiene de 10 a 128 caracteres y no puede ser una contraseña común.
3. **Inicio de sesión:** `POST /auth/login` con `{ login, password }`, donde `login` es el nombre de usuario **o** el correo (con "@" se toma como correo). `{ email, password }` sigue funcionando pero está obsoleto. Devuelve `{ tokenType, accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, user }`; `user` incluye `username` y los roles.
4. **Verificación de correo:** llega un código de 6 dígitos (en desarrollo, en Redis).
   - Confirmación: `POST /auth/email-verification/confirm` con `{ code }` y sesión iniciada.
   - Pedir otro código: `POST /auth/email-verification/request`.
   - **Hace falta para reservar** (403 `EMAIL_NOT_VERIFIED`).
5. **Renovación:** `POST /auth/refresh` con `{ refreshToken }` devuelve un par **nuevo**. El token usado queda inválido (rotación).
   - **Gracia de 10 s** (`REFRESH_TOKEN_GRACE_SECONDS`): si el mismo token se reenvía dentro de esa ventana (reintento tras perder la respuesta, o dos renovaciones a la vez), el servidor devuelve **el mismo** par nuevo, nunca uno distinto. Deja de valer en cuanto el sucesor se usa.
   - Fuera de la ventana, un token ya usado se trata como robo y **cierra esa sesión en todos lados** (`INVALID_REFRESH_TOKEN`). La gracia es una red de seguridad, no un sustituto del _single-flight_.
   - Implementa la renovación como una sola operación compartida (_single-flight_): las peticiones que reciben 401 esperan esa renovación y luego se reintentan.
6. **Cierre de sesión:** `POST /auth/logout` con `{ allDevices?: boolean }`, autenticado. Borra los tokens del dispositivo aunque la petición falle.
7. **Recuperar la contraseña:**
   - pedir el código: `POST /auth/password-reset/request` con `{ email }` (respuesta idéntica exista o no la cuenta);
   - confirmar: `POST /auth/password-reset/confirm` con `{ email, code, newPassword }`, que **cierra todas las sesiones**.
8. **Perfil:** `GET /users/me` y `PATCH /users/me`, para nombre, teléfono, preferencias, fecha de nacimiento y género; foto con `PUT`/`DELETE /users/me/photo`; contraseña con `POST /users/me/password`. El correo no se cambia en el MVP. Detalle en [`PERFIL.md`](PERFIL.md). Promociones, cupones y anuncios: [`PROMOCIONES.md`](PROMOCIONES.md). Perfil profesional del barbero, mensajes, bolsa de trabajo y videos: [`CARRERA.md`](CARRERA.md). Recomendación por forma de cara: [`FORMA-DE-CARA.md`](FORMA-DE-CARA.md).

### Qué hacer ante un 401

| Situación                                        | Acción                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 401 `UNAUTHORIZED` en una petición normal        | Renovar una vez (_single-flight_) y reintentar la petición. Si la renovación falla, cerrar sesión localmente y llevar al inicio de sesión. |
| 401 `INVALID_REFRESH_TOKEN` al renovar           | Sesión terminada (vencida, cerrada o revocada). Borrar los tokens e ir al inicio de sesión.                                                |
| 401 `INVALID_CREDENTIALS` en el inicio de sesión | "Usuario, correo o contraseña incorrectos." No distingas cuál.                                                                             |

**Roles que cambian:** si el usuario crea una barbería o lo vinculan como barbero, sus roles cambian. Las respuestas lo indican (`ownerRoleGranted`, `barberRoleGranted`). Para ver los roles nuevos en el JWT, **renueva la sesión** (`/auth/refresh`).

---

## 3. Formato de error y códigos

Todos los errores tienen la misma forma:

```json
{
  "code": "SLOT_NOT_AVAILABLE",
  "message": "Ese horario ya no está disponible. Elige otro.",
  "details": [],
  "requestId": "…"
}
```

- **`code`:** estable, en inglés. La app decide por el `code`, nunca por el texto.
- **`message`:** en español y apto para mostrarse al usuario.
- **`details`:** información adicional. En `VALIDATION_ERROR` es `[{ field, constraints: [...] }]`.
- **`requestId`:** también llega en la cabecera `X-Request-Id`. Inclúyelo en los reportes de error.

| Código                                  | HTTP      | Significado                                                                               | Qué hace la app                                                                      |
| --------------------------------------- | --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `BAD_REQUEST`                           | 400       | Solicitud inválida                                                                        | Mostrar `message`.                                                                   |
| `VALIDATION_ERROR`                      | 400       | Datos inválidos                                                                           | Marcar los campos de `details[].field`.                                              |
| `MALFORMED_JSON`                        | 400       | Cuerpo no es JSON                                                                         | Error de la app: registrar.                                                          |
| `UNAUTHORIZED`                          | 401       | Falta o venció el token de acceso                                                         | Renovar y reintentar (ver §2).                                                       |
| `INVALID_CREDENTIALS`                   | 401       | Usuario, correo o contraseña incorrectos                                                  | "Usuario, correo o contraseña incorrectos."                                          |
| `USERNAME_TAKEN`                        | 409       | Nombre de usuario en uso (registro o cambio)                                              | "Ese usuario ya está en uso." Marcar el campo.                                       |
| `USERNAME_CHANGE_TOO_SOON`              | 409       | Cambió el usuario hace menos de 30 días; `details[0].nextChangeAt`                        | "Podrás cambiarlo de nuevo el …"                                                     |
| `INVALID_REFRESH_TOKEN`                 | 401       | Sesión terminada                                                                          | Ir al inicio de sesión.                                                              |
| `INVALID_SIGNATURE`                     | 401       | Firma del resultado de pago inválida                                                      | Error de integración: reintentar la verificación o mostrar un error genérico.        |
| `FORBIDDEN`                             | 403       | Sin permiso para esa acción                                                               | Mostrar `message`; ocultar la acción en la interfaz.                                 |
| `EMAIL_NOT_VERIFIED`                    | 403       | Hay que verificar el correo para reservar                                                 | Llevar a verificar el correo.                                                        |
| `ACCOUNT_DISABLED`                      | 403       | Cuenta deshabilitada                                                                      | Mostrar `message` y el contacto de soporte.                                          |
| `HTTPS_REQUIRED`                        | 403       | Petición HTTP en producción                                                               | Error de configuración: usar HTTPS.                                                  |
| `NOT_FOUND`                             | 404       | No existe o no tienes acceso (por privacidad, ambos casos responden igual)                | Mostrar "No encontrado" y volver atrás.                                              |
| `METHOD_NOT_ALLOWED`                    | 405       | Método no permitido                                                                       | Error de la app.                                                                     |
| `CONFLICT`                              | 409       | Conflicto genérico                                                                        | Mostrar `message`.                                                                   |
| `ALREADY_MEMBER`                        | 409       | Ya es responsable de esa barbería                                                         | Mostrar `message`.                                                                   |
| `LAST_OWNER`                            | 409       | No se puede quitar o degradar al último OWNER                                             | Mostrar `message`.                                                                   |
| `STATUS_CHANGE_NOT_ALLOWED`             | 409       | Barbería en revisión o suspendida                                                         | Mostrar `message`.                                                                   |
| `HAS_FUTURE_BOOKINGS`                   | 409       | Hay reservas futuras activas                                                              | Mostrar `message` (gestionar esas reservas antes).                                   |
| `BARBER_ALREADY_ACTIVE_ELSEWHERE`       | 409       | La cuenta ya es barbero activo en otra barbería                                           | Mostrar `message`.                                                                   |
| `BARBER_ALREADY_LINKED`                 | 409       | El perfil de barbero ya tiene una cuenta                                                  | Mostrar `message`.                                                                   |
| `INVITATION_NO_LONGER_VALID`            | 409       | Invitación vencida o usada                                                                | Pedir una invitación nueva.                                                          |
| `INDEPENDENT_SINGLE_BARBER`             | 409       | Un barbero independiente tiene un solo barbero activo                                     | Mostrar `message`.                                                                   |
| `BLOCK_OVERLAPS_BOOKINGS`               | 409       | El bloqueo choca con reservas activas (`details` trae cuántas)                            | Mostrar `message`.                                                                   |
| `SLOT_NOT_AVAILABLE`                    | 409       | El turno ya no está libre (o no es un turno válido)                                       | Recargar los turnos y pedir otro.                                                    |
| `TOO_MANY_PENDING_BOOKINGS`             | 409       | Ya tiene 2 reservas sin pagar                                                             | "Paga o cancela alguna antes de reservar otra."                                      |
| `IDEMPOTENCY_KEY_REUSED`                | 409       | Misma `Idempotency-Key` con otros datos                                                   | Error de la app: generar otra clave por intento.                                     |
| `CANCELLATION_NOT_ALLOWED`              | 409       | Ya empezó o no se puede cancelar                                                          | Mostrar `message`.                                                                   |
| `ALREADY_CANCELLED`                     | 409       | Ya estaba cancelada                                                                       | Refrescar la reserva.                                                                |
| `PAYMENT_NOT_AVAILABLE`                 | 409       | La reserva ya no está pendiente de pago o venció                                          | Refrescar; si venció, ofrecer reservar de nuevo.                                     |
| `INVALID_STATE_TRANSITION`              | 409       | La reserva no admite ese cambio ahora                                                     | Refrescar la reserva.                                                                |
| `NO_SHOW_NOT_ALLOWED`                   | 409       | Fuera de la ventana de inasistencia (15 min a 24 h tras el inicio)                        | Mostrar `message`.                                                                   |
| `ATTENDANCE_NOT_ALLOWED`                | 409       | Fuera de la ventana para marcar atendida                                                  | Mostrar `message`.                                                                   |
| `ATTENDANCE_CORRECTION_NOT_ALLOWED`     | 409       | Fuera del plazo de corrección (48 h)                                                      | "Contacta a soporte."                                                                |
| `ALREADY_REVIEWED`                      | 409       | Ya calificada (soporte)                                                                   | —                                                                                    |
| `REVIEW_NOT_ALLOWED`                    | 409       | La reserva no está atendida o pasó el plazo de 14 días                                    | Ocultar "Valorar".                                                                   |
| `REVIEW_ALREADY_EXISTS`                 | 409       | Ya valoraste esta reserva                                                                 | Ir a la valoración existente.                                                        |
| `REVIEW_EDIT_NOT_ALLOWED`               | 409       | Ya se editó una vez o pasó el plazo                                                       | Ocultar "Editar" (`canEdit`).                                                        |
| `ALREADY_REPORTED`                      | 409       | Ya reportaste ese contenido                                                               | "Ya lo reportaste."                                                                  |
| `TICKET_CLOSED`                         | 409       | El ticket está cerrado o pasó el plazo para reabrirlo                                     | Ofrecer abrir uno nuevo.                                                             |
| `ACCOUNT_PENDING_DELETION`              | 403       | Cuenta pendiente de eliminación (login o sesión con `scope: "deletion"`)                  | Pantalla "Tu cuenta se eliminará el …" con "Cancelar eliminación" (ver `CUENTA.md`). |
| `DELETION_BLOCKED`                      | 409       | No se puede eliminar la cuenta todavía (`details`: bloqueos)                              | Mostrar cada bloqueo (`SOLE_OWNER`, `STAFF_ROLE`).                                   |
| `REVIEW_REQUIREMENTS_MISSING`           | 409       | Falta algo para enviar la barbería a revisión (`details[].requirement`)                   | Mostrar lo que falta (ver `ALTA.md`).                                                |
| `INVALID_IMAGE`                         | 400       | El archivo no es JPEG, PNG ni WebP (se mira el contenido, no la extensión)                | "Esa imagen no se puede usar." Convertir HEIC antes de subir (ver `IMAGENES.md`).    |
| `PAYLOAD_TOO_LARGE`                     | 413       | Imagen de más de 10 MB                                                                    | Comprimir o redimensionar en la app antes de subir.                                  |
| `IMAGE_LIMIT_REACHED`                   | 409       | Galería llena (60) o máximo de destacadas (6); `details[].limit`                          | "Borra una foto para subir otra." / "Quita una destacada."                           |
| `STORAGE_UNAVAILABLE`                   | 503       | El almacenamiento de imágenes no responde                                                 | Reintentar más tarde.                                                                |
| `ACCOUNT_DISABLED` (sesión restringida) | 403       | La sesión de soporte de una cuenta deshabilitada solo sirve para tickets                  | Volver a la pantalla de ayuda.                                                       |
| `WEBHOOK_MISMATCH` / `WEBHOOK_TOO_OLD`  | 409 / 400 | Solo para la pasarela                                                                     | No aplica a la app.                                                                  |
| `INVALID_CODE`                          | 400       | Código incorrecto, vencido o usado                                                        | "Código inválido o vencido." Ofrecer reenviar.                                       |
| `TERMS_VERSION_OUTDATED`                | 400       | Cambió la versión de los términos                                                         | Volver a pedir `GET /auth/terms` y aceptar de nuevo.                                 |
| `DATE_OUT_OF_RANGE`                     | 400       | Fecha pasada o fuera del horizonte (30 días); `details` trae `today` y `lastBookableDate` | Limitar el calendario a ese rango.                                                   |
| `INVALID_CURSOR`                        | 400       | Cursor inválido o de otro orden                                                           | Recargar desde la primera página.                                                    |
| `IDEMPOTENCY_KEY_REQUIRED`              | 400       | Falta la cabecera `Idempotency-Key` (UUID)                                                | Error de la app.                                                                     |
| `PAYLOAD_TOO_LARGE`                     | 413       | Cuerpo demasiado grande                                                                   | Error de la app.                                                                     |
| `UNSUPPORTED_MEDIA_TYPE`                | 415       | Tipo de contenido no soportado                                                            | Error de la app (usar JSON).                                                         |
| `WRONG_PASSWORD`                        | 400       | Cambio de contraseña: la actual no es correcta (no cierra la sesión)                      | Marcar el campo "Contraseña actual".                                                 |
| `COUPON_NOT_VALID`                      | 409       | El cupón no se puede usar al reservar (`details[0].reason`)                               | Mostrar el motivo y volver a cotizar (ver `PROMOCIONES.md`).                         |
| `COUPON_CODE_TAKEN`                     | 409       | Ese código de cupón ya existe                                                             | "Elige otro código."                                                                 |
| `CONVERSATION_BLOCKED`                  | 409       | La conversación está bloqueada                                                            | Deshabilitar el envío (ver `CARRERA.md`).                                            |
| `ALREADY_APPLIED`                       | 409       | Ya postuló a esa oferta o ya trabaja en esa barbería                                      | Mostrar el estado de su postulación.                                                 |
| `JOB_POSTING_CLOSED`                    | 409       | La oferta está cerrada                                                                    | "Esta oferta ya cerró."                                                              |
| `VIDEO_LIMIT_REACHED`                   | 409       | Tope de videos (`details[0].limit`)                                                       | "Borra un video para subir otro."                                                    |
| `ACCOUNT_LOCKED`                        | 429       | Demasiados intentos fallidos de acceso                                                    | "Espera unos minutos." `details[0].retryAfterSeconds` indica cuánto.                 |
| `TOO_MANY_REQUESTS`                     | 429       | Límite de peticiones                                                                      | Esperar y reintentar con espera creciente.                                           |
| `INTERNAL_ERROR`                        | 500       | Error inesperado                                                                          | Mensaje genérico; reportar con `requestId`.                                          |
| `SERVICE_UNAVAILABLE`                   | 503       | No disponible por un momento; en reservas, con `details: [{ retryable: true }]`           | Reintentar en unos segundos con **la misma** `Idempotency-Key`.                      |
| `PAYMENT_PROVIDER_ERROR`                | 502       | La pasarela no respondió                                                                  | Reintentar `POST /bookings/{id}/payment`.                                            |

---

## 4. Convenciones

- **Paginación por cursor:** `?limit=&cursor=` devuelve `{ items: [...], nextCursor }`. Para la página siguiente, envía `cursor=nextCursor`; si es `null`, no hay más. El cursor es opaco: no lo construyas ni lo interpretes.
- **Fechas:**
  - Los instantes van en **ISO 8601 en UTC**, por ejemplo `2030-01-07T14:00:00.000Z`.
  - Los días de calendario de una barbería (`date=YYYY-MM-DD` en disponibilidad y agenda) son su **fecha local**; cada respuesta trae `timezone` (`America/Lima`).
  - Muestra las horas en la zona de la barbería, no en la del teléfono.
- **Dinero:** `{ "amount": 2500, "currency": "PEN" }`, con `amount` en **céntimos**: 2500 = S/ 25,00. Los precios incluyen impuestos.
- **`Idempotency-Key`:** obligatoria en `POST /bookings`.
  - Genera un UUID **por intento de reserva** y reutilízalo en los reintentos de ese mismo intento (por ejemplo, ante un timeout o un 503).
  - Repetir la misma petición devuelve la misma reserva (200).
- **Límites de peticiones:**

  | Alcance              | Límite                        |
  | -------------------- | ----------------------------- |
  | General              | 100 por minuto por IP         |
  | Autenticación        | 10 por minuto por IP          |
  | Consultas públicas   | 60 por minuto                 |
  | Búsqueda             | 60 por minuto                 |
  | Creación de reservas | 20 por minuto **por cliente** |
  | Pagos                | 20 por minuto                 |

  Ante un 429, espera y reintenta. En redes móviles muchos usuarios comparten IP: ver `AJUSTES-BACKEND.md`.

- **Privacidad:** la ubicación enviada a la búsqueda no se guarda. Los datos personales de terceros nunca vienen en las respuestas; el personal de la barbería solo ve el nombre del cliente.

---

## 5. Flujos paso a paso

**Servicio de una reserva:** `service` trae `{ id, name, categoryKey }` en reservas, listas y agenda (para íconos y filtros).

**Zona horaria:** toda respuesta con horas de una barbería trae su `timezone` (IANA): reservas (`barbershop.timezone`), disponibilidad (día, ahora y siguiente), horario de la barbería y del barbero, bloqueos, agenda, resultados de búsqueda y alternativas. Muestra siempre las horas en **esa** zona, no en la del teléfono.

**Términos:** `GET /auth/terms` devuelve `{ version, termsUrl, privacyUrl }`. Abre esas URLs en el registro; si llegan `null`, oculta el enlace. Hoy son provisionales.

Las rutas son relativas a `/api/v1`. "Sesión" significa la cabecera `Authorization`.

### Cliente

1. **Categorías para los filtros:** `GET /service-categories`.
2. **Buscar:** `GET /search/barbershops?lat=&lng=&radiusKm=&q=&category=&minPrice=&maxPrice=&minRating=&type=&openNow=&availableNow=&date=&sort=&limit=&cursor=`.
   - Sin sesión.
   - `lat`/`lng` dentro de Perú; el radio es de 5 km por defecto y como máximo 25.
   - Cada resultado trae distancia, "precio desde", `isOpenNow`, `availableNow`, `featured`, `isFavorite` y `timezone` (zona de esa barbería).
   - **Sesión opcional:** es un endpoint público, pero si envías el token, `isFavorite` dice si la barbería es favorita de la cuenta (sin sesión, siempre `false`). Un token vencido o inválido no da error aquí: responde como anónimo. Estas respuestas llevan `Cache-Control: private, no-store` (con sesión) o `no-cache` (sin ella) y `Vary: Authorization`: no las guardes en una caché compartida entre cuentas.
3. **Ver la barbería:**
   - `GET /barbershops/{id}` (con el token, también trae `isFavorite`)
   - `GET /barbershops/{id}/business-hours`
   - `GET /barbershops/{id}/services`
   - `GET /barbershops/{id}/barbers`
4. **Ver turnos:**
   - `GET /barbershops/{id}/availability?serviceId=&date=YYYY-MM-DD[&barberId=]`, sin barbero = cualquier barbero;
   - también `/availability/now?serviceId=` y `/availability/next?serviceId=`;
   - si no hay turnos: `GET /barbershops/{id}/alternatives?serviceId=&date=`. Cada alternativa trae `barbershop.timezone`: muestra su `firstSlot` en **esa** zona, no en la de la barbería original.
5. **Reservar:** `POST /bookings` con `{ barbershopId, serviceId, startAt, barberId? }`, sesión, correo verificado e `Idempotency-Key`.
   - `startAt` debe ser **exactamente** el `startAt` de un turno devuelto en el paso 4.
   - Responde 201 con la reserva `PENDING_PAYMENT`, `expiresAt` (10 min para pagar) y `payment`.
6. **Pagar:** ver [`PAGOS.md`](PAGOS.md).
   - `POST /bookings/{id}/payment` inicia o reintenta el pago y devuelve `clientAction`.
   - `GET /bookings/{id}/payment` da el estado del pago y de los reembolsos.
   - Tras pagar con el SDK: `POST /bookings/{id}/payment/verify`.
7. **Mis reservas:**
   - `GET /me/bookings?scope=upcoming|history`
   - `GET /bookings/{id}`
8. **Cancelar:**
   1. `GET /bookings/{id}/cancellation-preview` dice si se puede y cuánto se devolverá (`refund.amount`, `percent`, `rule`). **Muéstralo antes de confirmar.**
   2. `POST /bookings/{id}/cancel` devuelve la reserva con el reembolso aplicado.

   Política: con 5 h o más de anticipación se devuelve todo; con 2 h o más, el 50 %; con menos, nada. Una reserva sin pagar se puede cancelar siempre.

9. **Favoritos:**
   - marcar y quitar: `PUT` y `DELETE /me/favorites/{barbershopId}` (204, idempotentes; marcar una barbería no pública da 404);
   - listar: `GET /me/favorites` (las más recientes primero). Una barbería suspendida desaparece de la lista y vuelve si se reactiva.
10. **Valorar:** `POST /bookings/{id}/review` con `{ rating: 1..5, comment? }` (comentario de 3 a 500 caracteres, texto plano).
    - Solo reservas propias `ATTENDED`, una vez, dentro de 14 días desde que quedaron atendidas. Si no: 409 `REVIEW_NOT_ALLOWED` o `REVIEW_ALREADY_EXISTS`.
    - Editar **una sola vez** dentro del plazo: `PATCH /reviews/{id}` (si no, 409 `REVIEW_EDIT_NOT_ALLOWED`). Retirar: `DELETE /reviews/{id}`.
    - `GET /me/reviews` trae `status` y `canEdit` (úsalo para mostrar u ocultar "Editar").
    - **Cuándo mostrar "Valorar":** cada reserva trae `canReview` (no deducirlo) y `review` (`{ id, rating, canEdit }` o `null`) para mostrar "Editar" o "Ver". Para la barbería, siempre `false` y `null`.
    - **Aviso "¿Cómo te fue?":** `GET /me/bookings/pending-reviews` → `{ items }`, las reservas con `canReview = true`, de la más reciente a la más antigua (hasta 20).
11. **Opiniones de una barbería:** `GET /barbershops/{id}/reviews?barberId=&rating=` sin sesión. El autor llega como "Ana R."; `response` es la respuesta de la barbería o `null`. El promedio está en `rating` de la barbería y de cada barbero.
12. **Reportar:** `POST /reviews/{id}/reports` con `{ target: "REVIEW" | "RESPONSE", reason, details? }` (motivos: `OFFENSIVE`, `PERSONAL_DATA`, `FAKE`, `SPAM`, `OTHER`). 204; una vez por contenido (409 `ALREADY_REPORTED`); el propio contenido no se reporta (403).

### Responsable (OWNER o MANAGER)

> **Alta con revisión previa:** una barbería nueva queda en `DRAFT` o `PENDING_REVIEW` y no es pública hasta que soporte la aprueba. Exige el documento del responsable (RUC o DNI). Ver [`ALTA.md`](ALTA.md).

1. **Crear la barbería:**
   - barbería: `POST /barbershops`;
   - barbero independiente: `POST /barbershops/independent`.

   Después, renueva la sesión para tener el rol OWNER.

2. **Mis barberías:**
   - `GET /me/barbershops`
   - `GET /me/barbershops/{id}`
   - editar: `PATCH /barbershops/{id}`
   - estado (abierta o cerrada temporalmente): `PATCH /barbershops/{id}/status`
3. **Servicios:**
   - crear: `POST /barbershops/{id}/services`, con `categoryKey`, precio en céntimos mayor que 0 y duración de 5 a 480 minutos en múltiplos de 5;
   - listar: `GET /me/barbershops/{id}/services`;
   - editar y eliminar: `PATCH` y `DELETE /barbershops/{id}/services/{serviceId}`.
4. **Barberos:**
   - crear: `POST /barbershops/{id}/barbers`;
   - registrarse a sí mismo: `POST /barbershops/{id}/barbers/me`;
   - invitar a una cuenta: `POST /barbershops/{id}/barbers/{barberId}/invitations`;
   - asignar servicios: `PUT /barbershops/{id}/barbers/{barberId}/services`;
   - editar o desactivar: `PATCH /barbershops/{id}/barbers/{barberId}`;
   - listar: `GET /me/barbershops/{id}/barbers`.
5. **Responsables:**
   - invitar: `POST /barbershops/{id}/members/invitations`;
   - listar: `GET /barbershops/{id}/members`;
   - cambiar el rol y quitar: `PATCH` y `DELETE /barbershops/{id}/members/{userId}`.
6. **Horarios:**
   - de la barbería: `PUT /barbershops/{id}/business-hours`;
   - de un barbero: `PUT /barbershops/{id}/barbers/{barberId}/schedule` (vacío = hereda el de la barbería).

   Varias ventanas por día permiten descansos; las horas van en múltiplos de 5 minutos y sin cruzar la medianoche.

7. **Bloqueos:**
   - crear: `POST /barbershops/{id}/time-blocks` (si choca con reservas, 409 `BLOCK_OVERLAPS_BOOKINGS`);
   - listar y eliminar: `GET` y `DELETE /barbershops/{id}/time-blocks[/{blockId}]`.
8. **Agenda del día:** `GET /barbershops/{id}/agenda?date=&barberId=`. Trae las reservas con `actions` (`canMarkAttended`, `canMarkNoShow`, `canCorrect`, `canCancel`), los bloqueos y `pendingAttention`.
   - Usa siempre `actions`: la app no deduce permisos ni plazos. Después de cada acción, vuelve a pedir la agenda.
   - `date`: fecha real, desde **90 días atrás** hasta el **horizonte de reservas (30 días)** hacia adelante, en el calendario de la barbería. Fuera de ese rango: 400 `DATE_OUT_OF_RANGE` con `details: [{ today, firstDate, lastDate, timezone }]`, útil para limitar el selector. Una fecha imposible (`2030-02-30`): 400 `VALIDATION_ERROR` en `date`.
   - Los motivos de corrección y de cancelación son de 3 a 300 caracteres (publicado en el contrato).
9. **Asistencia:**
   - marcar: `POST /bookings/{id}/attended` y `POST /bookings/{id}/no-show`;
   - corregir: `POST /bookings/{id}/attendance-correction` con `{ status, reason }`.
10. **Reservas:**
    - listar: `GET /barbershops/{id}/bookings?scope=`;
    - cancelar con motivo obligatorio: `POST /bookings/{id}/cancel` con `{ reason }`. Se devuelve todo y la cancelación queda registrada para revisión.
11. **Responder valoraciones:** `PUT /reviews/{id}/response` con `{ text }` (hasta 500 caracteres). Una respuesta por valoración, editable con la misma llamada. El barbero no responde.
    - **Lista de la barbería:** `GET /me/barbershops/{id}/reviews?status=&barberId=&rating=` (OWNER o MANAGER; otro recibe 404). Incluye las ocultas y en revisión, con `status`, `responseStatus` (la respuesta llega aunque soporte la haya ocultado) y `canRespond`.

### Notificaciones (todos)

Ver [`PUSH.md`](PUSH.md): registrar el dispositivo (`PUT /me/devices`, token en el cuerpo), tipos de aviso y navegación, horario silencioso, preferencias y bandeja (`GET /me/notifications`).

### Eliminar la cuenta (todos)

Ver [`CUENTA.md`](CUENTA.md): vista previa (`GET /me/account/deletion/preview`), confirmación con la contraseña, 30 días para arrepentirse y acceso limitado con `scope: "deletion"`.

### Ayuda y reportes (todos)

1. **Tickets de soporte:** `POST /support/tickets` con `{ category, subject, message, relatedType?, relatedId? }` (relación opcional con una reserva, un pago o una barbería propios). Máximo 5 abiertos (429).
   - `GET /me/support/tickets` y `GET /me/support/tickets/{id}` (mensajes con `from: USER | SUPPORT`; nunca notas internas). Usa `canReply`.
   - Responder: `POST /me/support/tickets/{id}/messages` con `{ body }`. Un ticket `RESOLVED` se reabre si respondes dentro de 7 días; si no, 409 `TICKET_CLOSED` (abrir otro).
2. **Cuenta deshabilitada:** el login da 403 `ACCOUNT_DISABLED`. Con el mismo correo y contraseña, `POST /auth/support-access` devuelve un `accessToken` **restringido** (sin `refreshToken`, 15 min) con `scope: "support"`, que solo sirve para los endpoints de tickets y para pedir la eliminación de la cuenta; cualquier otro responde 403 `ACCOUNT_DISABLED`. Muestra solo la pantalla de ayuda.
3. **Reportar una barbería:** `POST /barbershops/{id}/reports` con `{ reason, details? }` (`FRAUD`, `MISLEADING_INFO`, `INAPPROPRIATE`, `NOT_OPERATING`, `SAFETY`, `OTHER`). 204; una vez por cuenta (409 `ALREADY_REPORTED`); sus miembros no la reportan (403).

El panel de soporte (`/api/v1/admin`) no es para la app móvil.

### Barbero

1. **Aceptar la invitación:**
   - `GET /me/barbershop-invitations`;
   - `POST /me/barbershop-invitations/{invitationId}/accept` con `{ code }` (el código llega por correo).

   Después, renueva la sesión para tener el rol BARBER.

2. **Perfil propio:** `GET /me/barber` devuelve `{ items: [{ barberId, displayName, isActive, serviceIds, barbershop: { id, name, status, timezone } }] }` (activos primero; lista vacía si no es barbero). De aquí sale el `barberId` para bloqueos y agenda.
3. **Agenda del día:** `GET /me/barber/agenda?date=` (la del perfil activo; mismo rango de fechas). El barbero no puede corregir ni cancelar (`canCorrect` y `canCancel` siempre `false`).
4. **Reservas que atiende:** `GET /me/barber/bookings?scope=`.
5. **Bloqueos propios:**
   - `POST /barbershops/{shopId}/time-blocks` con `barberId` igual a su perfil;
   - `GET` y `DELETE` sobre sus bloqueos.

   Los `id` de la barbería vienen en la agenda (`barbershop.id`). Hoy no hay un endpoint directo para conocer el propio `barberId` (ver `AJUSTES-BACKEND.md`).

6. **Horario:** puede consultarlo (`GET /barbershops/{id}/barbers/{barberId}/schedule`), pero no cambiarlo.
7. **Asistencia:**
   - `POST /bookings/{id}/attended`, desde la hora de inicio y hasta 24 h después;
   - `POST /bookings/{id}/no-show`, desde 15 minutos y hasta 24 h después.

---

## 6. Estados

### Reserva (`BookingStatus`)

| Estado            | Significado                                                          | Acciones permitidas                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PENDING_PAYMENT` | Creada, esperando el pago (10 min, `expiresAt`)                      | Cliente: pagar o cancelar (siempre). Barbería: cancelar con motivo.                                                                                   |
| `CONFIRMED`       | Pagada                                                               | Cliente: cancelar hasta el inicio (con la política de devolución). Barbería: cancelar (devolución total) y marcar atendida o no-show en sus ventanas. |
| `ATTENDED`        | Atendida (manual o cierre automático 24 h después del inicio)        | Barbería: corregir a `NO_SHOW` dentro de 48 h. (Fase 11: valorar.)                                                                                    |
| `NO_SHOW`         | El cliente no asistió; sin devolución                                | Barbería: corregir a `ATTENDED` dentro de 48 h.                                                                                                       |
| `CANCELLED`       | Cancelada (`cancellation.byRole`: `CLIENT`, `BARBERSHOP` o `SYSTEM`) | Ninguna.                                                                                                                                              |
| `EXPIRED`         | No se pagó a tiempo                                                  | Ninguna (reservar de nuevo).                                                                                                                          |

### Pago (`PaymentStatus`) y reembolso (`RefundStatus`)

| Pago                              | Significado                                   |
| --------------------------------- | --------------------------------------------- |
| `PENDING`                         | Creado; aún sin resultado de la pasarela      |
| `SUCCEEDED`                       | Cobrado (la reserva pasa a `CONFIRMED`)       |
| `REJECTED` / `CANCELLED`          | Rechazado o cancelado (la reserva se cancela) |
| `PARTIALLY_REFUNDED` / `REFUNDED` | Devuelto en parte o por completo              |

Reembolso: `PENDING` (enviado o por enviar a la pasarela), `SUCCEEDED` o `FAILED`. La app los ve en `GET /bookings/{id}/payment`.

---

## 7. Qué está disponible hoy y qué no

| Fase                 | Estado                                                                                                                                                                                                                                                                                                                            | Qué deja preparado la app                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1–12 y 14 (salvo 8B) | **Disponible**: cuentas, barberías, servicios, barberos, horarios, disponibilidad, búsqueda, reservas, pagos con `FakeGateway`, reembolsos, asistencia, agenda, favoritos, valoraciones, tickets de soporte, notificaciones (push simulado en desarrollo) e imágenes (logo, portada, foto de barbero, galería; ver `IMAGENES.md`) | —                                                                   |
| 8B                   | **Falta**: pago real con Izipay (SDK, `formToken`)                                                                                                                                                                                                                                                                                | Pantalla de pago detrás de un módulo intercambiable; ver `PAGOS.md` |
| 13                   | **Falta**: promociones, cupones, auspiciadores y destacados                                                                                                                                                                                                                                                                       | Hoy `featured` siempre es `false`; espacio para banners             |
| 15–16                | **Falta**: planes de suscripción y membresías                                                                                                                                                                                                                                                                                     | —                                                                   |

Estado detallado del proyecto: `docs/ESTADO.md`.
