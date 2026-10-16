# Carrera del barbero en la app móvil

Para quien construye la app. **Idea central:** el progreso es del barbero, no de la barbería. Su perfil profesional junta sus valoraciones, su portafolio, sus especialidades y su ranking en todas las barberías donde trabaja (puede ser más de una a la vez) y como independiente. Si se va de una barbería, se lo lleva.

## 1. Perfil profesional

| Acción                               | Endpoint                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Ver mi perfil (404 si aún no existe) | `GET /me/barber-profile`                                                                         |
| Crear o editar                       | `PUT /me/barber-profile`                                                                         |
| Especialidades (máx. 10 estilos)     | `PUT /me/barber-profile/specialties` `{ "styleIds": [...] }`                                     |
| Foto (512 px)                        | `PUT` / `DELETE /me/barber-profile/photo` (multipart `file`)                                     |
| Subir corte al portafolio            | `POST /me/barber-profile/portfolio` (multipart: `file`, `consent=true`, `caption?`, `styleIds?`) |
| Quitar corte                         | `DELETE /me/barber-profile/portfolio/{imageId}`                                                  |
| Dejar una barbería                   | `POST /me/barber-profile/workplaces/{barberId}/leave`                                            |

`PUT /me/barber-profile`: `displayName` (2–60, obligatorio), `headline?` (≤80), `bio?` (≤600), `yearsExperience?` (0–60), `district?` (2–60), `availableForWork?`. `null` borra los opcionales. **Crearlo da el rol `BARBER`**: renueva la sesión (`/auth/refresh`) para verlo en el token. Cualquier cuenta puede crear su perfil (para postular a ofertas sin trabajar todavía en una barbería).

Respuesta (`BarberProfileDto`): datos del perfil, `photoUrl`, `ratingAverage` (null sin valoraciones), `ratingCount`, `attendedCount`, `rank` (null hasta 3 valoraciones), `specialties`, `workplaces` (en `/me`, las actuales y las pasadas con `current`, `since`, `until`; en el perfil público, solo las actuales) y `createdAt`.

**Dejar una barbería:** el vínculo termina, no se borra. 409 `HAS_FUTURE_BOOKINGS` si tiene reservas futuras activas allí; 409 `CONFLICT` si es su barbería independiente. Sus valoraciones y cortes siguen en su perfil; la barbería deja de mostrar esos cortes en su galería.

**Pasar a independiente:** se crea una barbería de tipo `INDEPENDENT` como siempre (`POST /barbershops`); su vínculo queda enlazado a su perfil y conserva todo.

### Vista pública (sin sesión)

- `GET /barber-profiles/{id}`: perfil, dónde trabaja hoy y especialidades.
- `GET /barber-profiles/{id}/portfolio?cursor=&limit=&style=`: sus cortes en todas sus barberías y los propios (`barbershopName` null si lo subió desde su perfil).
- `GET /barber-profiles/{id}/reviews?cursor=&limit=`: valoraciones de toda su carrera (solo el nombre de pila del cliente).
- `GET /barber-profiles/{id}/videos`: sus videos listos.
- En la barbería, cada barbero trae ahora `profileId` (en `GET /barbershops/{id}/barbers`): úsalo para abrir su perfil de carrera. Es null si el barbero no tiene cuenta.

### Ranking: `GET /barbers/ranking`

Filtros: `style` (clave), `district`, `q` (nombre), `availableForWork=true` (para barberías que buscan personal), `sort` (`ranking` o `newest`), `offset` y `limit` (paginación por desplazamiento: `nextOffset`).

- Puntaje: promedio bayesiano (`score`, 0–5) para que pocas valoraciones no pesen como muchas. Entra al ranking con **3 valoraciones**; antes, `rank` es null y aparece después.
- Cada barbero: `rank`, `displayName`, `headline`, `photoUrl`, `district`, `ratingAverage`, `ratingCount`, `attendedCount`, `score`, `availableForWork`, `specialties` y `currentBarbershops`.

## 2. Correo interno (mensajes)

Conversaciones entre una **barbería** (sus OWNER y MANAGER) y una **persona**. Dos tipos: `CLIENT` (consultas de clientes) y `PROFESSIONAL` (barbería y barbero: invitaciones, postulaciones, trabajo). La barbería **no puede escribir primero a un cliente** (anti-spam); a un barbero sí, desde su perfil.

### Como persona (cliente o barbero)

| Acción                                | Endpoint                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Mis conversaciones                    | `GET /me/conversations?cursor=&limit=`                                                                    |
| Cuántas tienen no leídos (insignia)   | `GET /me/conversations/unread` → `{ conversations }`                                                      |
| Escribir a una barbería               | `POST /me/conversations` `{ barbershopId, body, kind? }` (`kind=PROFESSIONAL` como barbero; exige perfil) |
| Leer (marca como leída la 1.ª página) | `GET /me/conversations/{id}/messages`                                                                     |
| Responder                             | `POST /me/conversations/{id}/messages` `{ body }`                                                         |
| Bloquear / desbloquear                | `POST /me/conversations/{id}/block` / `unblock`                                                           |
| Reportar un mensaje recibido          | `POST /messages/{id}/report` `{ reason, details? }`                                                       |

### Como barbería (OWNER o MANAGER)

Igual bajo `/barbershops/{barbershopId}/conversations`, más `POST /barbershops/{barbershopId}/conversations` `{ barberProfileId, body }` para escribir a un barbero.

### Detalles

- `body`: 1 a 2000 caracteres. Límite de envíos: 30 por minuto (429).
- Mensajes: `side` (`BARBERSHOP`, `USER` o `SYSTEM` para los automáticos de Charles), `mine`, `senderName`, `body`, `removed` (retirado por soporte: muestra el texto que llega), `createdAt`. Más recientes primero.
- Conversación: `counterpart` (con quién hablo; si es un barbero, `barberProfileId`), `lastMessagePreview`, `unread`, `blocked`, `blockedByMe`.
- 409 `CONVERSATION_BLOCKED` al escribir en una bloqueada. Solo quien bloqueó desbloquea (403 si no).
- Reportar: 403 si es un mensaje propio o de Charles; 409 `ALREADY_REPORTED` la segunda vez. Motivos: `SPAM`, `HARASSMENT`, `INAPPROPRIATE`, `SCAM`, `OTHER`.
- **Avisos:** push y bandeja (`NEW_MESSAGE`, recurso `conversation`) por los mensajes de personas. Los automáticos (`SYSTEM`) no avisan aparte: su evento ya avisa (`JOB_APPLICATION_*`, invitación por correo). El correo electrónico solo con el primer mensaje sin leer, y **nunca lleva el contenido**: "Tienes un mensaje nuevo de …".

## 3. Bolsa de trabajo

### Barbero

- `GET /jobs?style=&employmentType=&area=&cursor=&limit=` (sin sesión): ofertas abiertas. Con sesión, `myApplicationStatus`.
- `GET /jobs/{id}`.
- `POST /jobs/{id}/applications` `{ message? }`: exige perfil profesional (403 si no). 409 `ALREADY_APPLIED` (o si ya trabaja ahí), 409 `JOB_POSTING_CLOSED`. La barbería recibe un mensaje automático y un aviso.
- `GET /me/job-applications` y `POST /me/job-applications/{id}/withdraw` (mientras esté `APPLIED` o `SHORTLISTED`).
- Estados: `APPLIED`, `SHORTLISTED`, `REJECTED`, `HIRED`, `WITHDRAWN`. Cada decisión de la barbería llega como mensaje y aviso (`JOB_APPLICATION_UPDATED`, recurso `job_application`).

### Barbería (OWNER o MANAGER)

- `GET` / `POST /barbershops/{id}/jobs`: `title` (5–80), `description` (20–2000), `employmentType` (`FULL_TIME`, `PART_TIME`, `WEEKENDS`, `COMMISSION`, `FREELANCE`), `compensationText?`, `styleIds?`, `closesAt?` (máx. 90 días). Máximo 10 abiertas.
- `PATCH /barbershops/{id}/jobs/{jobId}`: editar o `status: CLOSED/OPEN`.
- `GET /barbershops/{id}/jobs/{jobId}/applications`: postulantes con su perfil (foto, valoración, experiencia). Abre `GET /barber-profiles/{id}` para ver portafolio y ranking.
- `POST /barbershops/{id}/job-applications/{applicationId}/decision` `{ status: SHORTLISTED | REJECTED | HIRED }`. **`HIRED` crea el barbero en la barbería** (enlazado a su perfil): asígnale servicios (`PUT …/barbers/{barberId}/services`) y horario después.
- **Invitar desde el perfil:** `POST /barbershops/{id}/barber-invitations` `{ barberProfileId, message? }`. Crea el barbero en la barbería y le llega la invitación de siempre (código por correo, `me/barbershop-invitations`) más un mensaje en su bandeja.

## 4. Videos de 30 segundos

| Acción                                   | Endpoint                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| Videos públicos de una barbería          | `GET /barbershops/{id}/videos`                                           |
| Videos públicos de un barbero            | `GET /barber-profiles/{id}/videos`                                       |
| Subir (barbería, máx. 5)                 | `POST /barbershops/{id}/videos` (multipart: `file`, `caption?`)          |
| Subir (barbero, máx. 10)                 | `POST /me/barber-profile/videos`                                         |
| Los míos (también en proceso o fallidos) | `GET /barbershops/{id}/videos/manage`, `GET /me/barber-profile/videos`   |
| Borrar                                   | `DELETE /videos/{id}`                                                    |
| Reportar                                 | `POST /videos/{id}/report` `{ reason, details? }` (motivos de las fotos) |

- Archivo: MP4, MOV o WebM, **hasta 30 s y 50 MB**. Recorta y comprime en la app si puedes (sube más rápido).
- Responde **202** con `status: PROCESSING`. El servidor valida la duración real, comprime a 720p (H.264), **elimina los metadatos** (GPS incluido) y genera la miniatura. Consulta la lista cada pocos segundos hasta `READY` o `FAILED` (`failureReason`: `TOO_LONG`, `NOT_A_VIDEO`, `TOO_LARGE`, `PROCESSING_FAILED`).
- `READY`: `videoUrl` (MP4) y `posterUrl` (WebP). Reproduce con el `poster` y `preload="none"` para ahorrar datos.
- 409 `VIDEO_LIMIT_REACHED` con `details[0].limit`; 413 si pasa de 50 MB.

## Cambios de contrato (resumen para `pnpm sync:api`)

- **Nuevo:** todo lo de este documento y de `PROMOCIONES.md`.
- **Cambia:** un barbero puede trabajar en varias barberías. `BARBER_ALREADY_ACTIVE_ELSEWHERE` ahora significa "ya trabaja en **esta** barbería".
- **Campo nuevo:** `profileId` en los barberos de una barbería.
- **Tipos de aviso nuevos:** `NEW_MESSAGE`, `JOB_APPLICATION_RECEIVED`, `JOB_APPLICATION_UPDATED`, con recursos `conversation` y `job_application`.
- **Códigos de error nuevos:** `COUPON_NOT_VALID`, `COUPON_CODE_TAKEN`, `CONVERSATION_BLOCKED`, `ALREADY_APPLIED`, `JOB_POSTING_CLOSED`, `VIDEO_LIMIT_REACHED`.
