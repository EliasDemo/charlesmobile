# Imágenes en la app (Fase 14)

Logo y portada de la barbería, foto del barbero, galería de trabajos, estilos y especialidades. Todo está en `openapi.json` (etiqueta `images`).

## Cómo subir

- **`multipart/form-data`**, campo **`file`**. Un archivo por petición.
- **Formatos:** JPEG, PNG o WebP, hasta **10 MB**. La API mira el contenido real, no la extensión.
- **HEIC (iPhone): convertir en la app antes de subir.** Con `expo-image-manipulator`: `manipulateAsync(uri, [{ resize: { width: 2000 } }], { compress: 0.85, format: SaveFormat.JPEG })`. Redimensionar a unos 2000 px también ahorra datos.
- La API **borra todos los metadatos** (EXIF y ubicación GPS), aplica la orientación y guarda en WebP. No hace falta limpiar nada en la app.
- Límite: 20 subidas por minuto y cuenta (`429 TOO_MANY_REQUESTS`).

| Qué                 | Endpoint                                                         | Quién                              | Respuesta                              |
| ------------------- | ---------------------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| Logo                | `PUT` / `DELETE /barbershops/{id}/logo`                          | OWNER, MANAGER                     | `{ logoUrl, coverUrl, coverThumbUrl }` |
| Portada             | `PUT` / `DELETE /barbershops/{id}/cover`                         | OWNER, MANAGER                     | igual                                  |
| Foto del barbero    | `PUT` / `DELETE /barbershops/{id}/barbers/{barberId}/photo`      | OWNER, MANAGER o el propio barbero | `{ photoUrl }`                         |
| Foto de la galería  | `POST /barbershops/{id}/barbers/{barberId}/gallery`              | OWNER, MANAGER o el propio barbero | foto (201)                             |
| Editar foto         | `PATCH /barbershops/{id}/gallery/{imageId}`                      | igual                              | foto                                   |
| Borrar foto         | `DELETE /barbershops/{id}/gallery/{imageId}`                     | igual                              | 204                                    |
| Especialidades      | `PUT /barbershops/{id}/barbers/{barberId}/specialties`           | igual                              | 204                                    |
| Años de experiencia | `PATCH /barbershops/{id}/barbers/{barberId}` (`yearsExperience`) | OWNER, MANAGER                     | barbero                                |

**Galería, campos del formulario:**

- `consent` = `"true"`: **obligatorio**. Casilla "La persona de la foto dio su consentimiento para publicarla". Sin ella: 400.
- `caption` (opcional, hasta 200).
- `styleIds` (opcional, hasta 3): ids separados por comas, o el campo repetido.
- `serviceId` (opcional): servicio de la barbería para "Reservar este estilo".

Límites: 60 fotos por barbero (`IMAGE_LIMIT_REACHED`). Destacar con `PATCH … { "pinned": true }`, hasta 6.

## Cómo mostrar

- Las URLs vienen listas. **En desarrollo son relativas** (`/api/v1/media/img/…`): anteponer la URL base del backend. En producción son absolutas (`https://…`). Regla: si empieza con `/`, anteponer el host.
- Una misma imagen nunca cambia de URL: se puede guardar en caché sin límite (`expo-image` con `cachePolicy="disk"`). Una imagen nueva trae una URL nueva.
- **Barbería** (`GET /barbershops/{id}`, gestión y búsqueda): `logoUrl` (512×512), `coverUrl` (hasta 1600 px) y `coverThumbUrl` (400 px). En la búsqueda: `logoUrl` y `coverThumbUrl`. Cualquiera puede ser `null`: usar un marcador.
- **Barbero** (`GET /barbershops/{id}/barbers`): `photoUrl` (512×512), `yearsExperience` y `specialties` (`[{ id, key, name }]`).
- **Galería pública:** `GET /barbershops/{id}/gallery?barberId=&style=&limit=&cursor=` → `{ pinned, items, nextCursor }`.
  - `pinned` (destacadas) solo llega en la primera página; no se repite en `items`.
  - Cada foto: `thumbUrl` (cuadrícula), `largeUrl` (pantalla completa), `width` y `height` (de la grande, para reservar el espacio), `caption`, `styles`, `barberName` y `service`.
  - **"Reservar este estilo":** si `service` no es `null`, abrir la reserva con `service.id` y `barberId` ya elegidos.
- **Gestión:** `GET /me/barbershops/{id}/gallery` incluye las fotos ocultas, con `openReports`, `hidden` y `removed`. Mostrar "Oculta por reportes" o "Retirada por soporte". El barbero ve solo su galería.

## Estilos y búsqueda

- `GET /service-styles?category=haircut` → estilos activos (`id`, `key`, `name`, `categoryKey`). Sirven para etiquetar fotos, elegir especialidades y filtrar.
- Búsqueda: `GET /search/barbershops?style=fade_low` → barberías con fotos de ese estilo o un barbero con esa especialidad.

## Reportar una foto

- `POST /gallery/{imageId}/reports` con `{ "reason": "NOT_MY_PHOTO" | "NO_CONSENT" | "INAPPROPRIATE" | "MISLEADING" | "OTHER", "details"?: "…" }` → 204.
- Una vez por persona (`409 ALREADY_REPORTED`). La barbería no puede reportar sus fotos (403).
- Con 3 reportes abiertos la foto se oculta sola hasta que soporte la revise.

## Alta de barbería

Con `barbershops.require_photo` activo (lo está en `charles`), la **portada** es la "foto del local": hasta subirla, `GET /barbershops/{id}/review` incluye `PHOTO` en `missingRequirements`. Ver `ALTA.md`.
