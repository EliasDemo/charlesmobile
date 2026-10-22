# Comunidad (red social de barberías)

Publicaciones de barberías y barberos, feed, comentarios, me gusta, seguidores, eventos y moderación. Todas las rutas van bajo `/api/v1`. El contrato exacto está en `openapi.json` (etiqueta `community`).

- **Fotos:** las publicaciones admiten solo fotos (hasta 10). El video queda para una fase posterior.
- **Montos:** en céntimos.
- **Fechas:** ISO en UTC.
- **Cursores:** opacos; envía `nextCursor` tal cual.

## 1. Publicaciones

### Autor

El autor es una **barbería** o un **perfil profesional**:

- **Barbería:** envía `barbershopId`. Solo pueden hacerlo su OWNER o su MANAGER.
- **Perfil profesional:** sin `barbershopId`, se publica como el perfil profesional propio. Si no lo tiene, responde 404 y hay que crearlo antes.

### Tipos

| `type`         | Uso                | Campos propios                                                                   |
| -------------- | ------------------ | -------------------------------------------------------------------------------- |
| `PROMOTION`    | Promoción          | `promotionId` opcional (una promoción de la propia barbería)                     |
| `EVENT`        | Evento             | `event` **obligatorio**: `{ startsAt, endsAt?, address, lat?, lng?, capacity? }` |
| `WORK`         | Trabajo (un corte) | `barberProfileId?` (quién lo hizo) y `serviceId?` (para "reservar este estilo")  |
| `ANNOUNCEMENT` | Anuncio            | —                                                                                |

### Flujo para publicar con fotos

1. **Subir cada foto:** `POST /posts/media` (multipart, campo `file`). Acepta JPEG, PNG o WebP de hasta 10 MB. Devuelve `{ id, url, thumbUrl, width, height }`.
2. **Publicar:** `POST /posts` con `{ type, barbershopId?, body (≤ 2000), mediaIds: [ids en orden], commentsDisabled?, … }`.

### Endpoints

| Método | Ruta                                                           | Notas                                                                                             |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/posts/{id}`                                                  | Público. Devuelve **410 `POST_HIDDEN`** si la publicación fue retirada o está oculta por reportes |
| PATCH  | `/posts/{id}`                                                  | Autor: `body`, `mediaIds` (reemplaza las fotos), `event`, `commentsDisabled`                      |
| DELETE | `/posts/{id}`                                                  | Autor                                                                                             |
| PUT    | `/posts/{id}/pin`                                              | Autor: `{ pinned }` fija la publicación arriba en su perfil                                       |
| GET    | `/barbershops/{id}/posts`, `/professional-profiles/{id}/posts` | Públicos. Las fijadas van primero. Filtro `type`                                                  |

### Permisos y contadores en la respuesta

Cada publicación (`PostDto`) trae:

- **Permisos:** `canEdit`, `canDelete`, `canPin`. El backend decide; la app solo muestra u oculta los botones.
- **Contadores:** `counts { likes, comments, shares }`.
- **Con sesión:** `likedByMe`, `savedByMe`, `followingAuthor` y `myEventStatus`.

## 2. Feed

`GET /feed?tab=forYou|nearby|following&type=&lat=&lng=&radiusKm=&cursor=&limit=` es **público**: también funciona sin sesión.

| Pestaña                | Contenido                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `forYou` (por defecto) | Últimos 30 días, ordenado por interacción y frescura. Lo que sigues pesa el doble            |
| `nearby`               | **Exige `lat` y `lng`** (si no, 400). Radio `radiusKm`, 30 km por defecto. Trae `distanceKm` |
| `following`            | Lo de las barberías y perfiles que sigues. Sin sesión, sale vacío                            |

Nunca aparece el contenido de una cuenta con la que hay un bloqueo, ni el contenido retirado u oculto.

## 3. Comentarios (máximo 2 niveles)

| Método | Ruta                                | Notas                                                         |
| ------ | ----------------------------------- | ------------------------------------------------------------- |
| GET    | `/posts/{id}/comments`              | Primer nivel: fijados primero y luego los más recientes       |
| GET    | `/posts/{id}/comments?parentId={c}` | Respuestas de un comentario, de la más antigua a la más nueva |
| POST   | `/posts/{id}/comments`              | `{ body (≤ 1000), parentId?, mentionUserId? }`                |
| PATCH  | `/comments/{id}`                    | Solo su autor                                                 |
| DELETE | `/comments/{id}`                    | Su autor **o** el autor de la publicación                     |
| PUT    | `/comments/{id}/pin`                | Autor de la publicación; solo comentarios de primer nivel     |

- **Responder a una respuesta:** envía el **mismo `parentId`** (el comentario principal) más `mentionUserId` de la persona. Un tercer nivel responde 400.
- **Campos de cada comentario:** `authorIsOfficial` (lo escribió la barbería o el barbero autor), `mention`, `likes`, `replies`, `likedByMe`, `pinned`, `canEdit`, `canDelete` y `canPin`.
- **Comentarios desactivados:** si la publicación los desactivó, responde **409 `COMMENTS_DISABLED`**.

## 4. Me gusta, guardar, compartir y seguir

Todos son **idempotentes**: `PUT` activa y `DELETE` desactiva.

| Ruta                                                             | Respuesta                                       |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| `/posts/{id}/like`, `/comments/{id}/like`, `/reviews/{id}/like`  | `{ liked, likes }`                              |
| `/posts/{id}/save`                                               | `{ saved }`; lista en `GET /me/saved-posts`     |
| `/barbershops/{id}/follow`, `/professional-profiles/{id}/follow` | `{ following, followers }`; el `GET` es público |

**Valoraciones:** `PublicReviewDto` (de `GET /barbershops/{id}/reviews`) y `ProfileReviewDto` (de `GET /barber-profiles/{id}/reviews`) traen ahora `likes`, `likedByMe` y `authorPhotoUrl`.

**Compartir:** cada publicación trae `shareUrl`, una página web pública con vista previa para WhatsApp y Facebook. Opcionalmente, `POST /posts/{id}/share` suma un compartido (no necesita sesión).

## 5. Eventos

`PUT /posts/{id}/attendance` con `{ status: INTERESTED | GOING | NONE }` devuelve `{ status, going, interested, capacity }`.

- **Cupo:** si no quedan cupos para `GOING`, o si el evento ya terminó, responde **409 `EVENT_FULL`**.
- **Datos del evento:** `post.event` trae `going`, `interested`, `capacity` y `full`.

## 6. Moderación (obligatoria para App Store y Google Play)

- **Reportar:** `POST /reports` con `{ targetType: post | comment | user, targetId, reason, note? }` responde **202**. Es idempotente y nunca revela qué pasó con el contenido. Los motivos (`reason`) son `SPAM`, `OFFENSIVE`, `HARASSMENT`, `NUDITY`, `VIOLENCE`, `FALSE_INFO` y `OTHER`.
- **Autoocultado:** con **3 reportes de personas distintas** (configurable), la publicación o el comentario se oculta hasta que soporte lo revise.
- **Bloquear:** `PUT /users/{id}/block` y `DELETE /users/{id}/block`; la lista está en `GET /me/blocks`. El bloqueo oculta el contenido en ambos sentidos. Interactuar con contenido de alguien bloqueado responde **403 `BLOCKED`**.
- **Filtro de palabras:** un texto con palabras no permitidas responde **400 `CONTENT_NOT_ALLOWED`**.
- **Límite de frecuencia:** 10 publicaciones por hora, 30 comentarios cada 10 minutos y 120 acciones por minuto (me gusta, seguir, reportar). Al pasarse responde **429 `TOO_MANY_REQUESTS`**.
- **Revisión:** soporte revisa en el panel web, en la página **Comunidad**: descarta, retira o restaura.

### Códigos de error de Comunidad

| Código                | HTTP | Cuándo                                                 |
| --------------------- | ---- | ------------------------------------------------------ |
| `POST_HIDDEN`         | 410  | La publicación fue retirada o está oculta por reportes |
| `COMMENTS_DISABLED`   | 409  | El autor desactivó los comentarios                     |
| `EVENT_FULL`          | 409  | No quedan cupos o el evento ya terminó                 |
| `BLOCKED`             | 403  | Hay un bloqueo entre las cuentas                       |
| `CONTENT_NOT_ALLOWED` | 400  | El texto tiene palabras no permitidas                  |
| `TOO_MANY_REQUESTS`   | 429  | Se superó el límite de frecuencia                      |
| `NOT_FOUND`           | 404  | No existe, o no tienes permiso (no se revela cuál)     |

## 7. Notificaciones

Llegan en la app y por push (no por correo). Todas traen `resource.type = "post"`; al tocarlas, abre la publicación.

| `type`               | A quién                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `COMMUNITY_COMMENT`  | Al autor de la publicación                                                                                              |
| `COMMUNITY_REPLY`    | A quien escribió el comentario principal                                                                                |
| `COMMUNITY_MENTION`  | A la cuenta mencionada                                                                                                  |
| `COMMUNITY_LIKE`     | Al autor. **Se agrupan:** como máximo uno por publicación o comentario cada hora ("A @ana y 4 personas más les gusta…") |
| `COMMUNITY_NEW_POST` | A los seguidores de la barbería o del perfil                                                                            |

No se avisa a uno mismo ni entre cuentas con bloqueo.
