# Foros (preguntas y respuestas)

Espacio para preguntar y responder por tema: técnicas de corte, cuidado de la barba, el negocio, herramientas y estilos. Todas las rutas van bajo `/api/v1`. El contrato exacto está en `openapi.json` (etiqueta `forums`).

**Diferencia con la Comunidad:**

- En la Comunidad publican barberías y barberos (fotos, promociones, eventos).
- En los Foros **cualquier cuenta** pregunta, otros responden y quien preguntó marca **la mejor respuesta**.

Ninguno de los dos lleva publicidad.

- **Leer es público.** Para participar se necesita sesión.
- **Cursores:** opacos; envía `nextCursor` tal cual.
- **Mismas reglas que la Comunidad:** palabras no permitidas (400 `CONTENT_NOT_ALLOWED`), límites por cuenta (429), bloqueos entre cuentas y reportes.

## 1. Temas e hilos

| Método | Ruta                   | Notas                                                                                                                     |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/forums/categories`   | Temas activos, en su orden, con `threadCount`                                                                             |
| GET    | `/forums/threads`      | `categoryId?`, `q?` (busca en el título), `sort` = `recent` (fijados primero) \| `new` \| `unanswered`, `cursor`, `limit` |
| GET    | `/forums/threads/{id}` | Texto completo, `isMine`, `solutionReplyId`. **410 `THREAD_HIDDEN`** si fue retirado o está en revisión                   |
| POST   | `/forums/threads`      | `{ categoryId, title (8–140), body (≤ 5000) }`                                                                            |
| PATCH  | `/forums/threads/{id}` | Autor: `title`, `body` (queda `editedAt`)                                                                                 |
| DELETE | `/forums/threads/{id}` | Autor                                                                                                                     |

En la lista, cada hilo trae `replyCount`, `solved` (✓), `pinned` (📌), `locked` (cerrado) y `author` (`username`, `photoUrl`, `isBarber` para mostrar la insignia «Barbero»).

## 2. Respuestas

| Método | Ruta                            | Notas                                                                 |
| ------ | ------------------------------- | --------------------------------------------------------------------- |
| GET    | `/forums/threads/{id}/replies`  | La mejor respuesta va primero; luego `sort` = `oldest` \| `helpful`   |
| POST   | `/forums/threads/{id}/replies`  | `{ body (≤ 3000) }`. **409 `THREAD_LOCKED`** si soporte cerró el hilo |
| PATCH  | `/forums/replies/{id}`          | Autor                                                                 |
| DELETE | `/forums/replies/{id}`          | Autor                                                                 |
| PUT    | `/forums/replies/{id}/helpful`  | «Me sirvió» (idempotente). 403 en una respuesta propia                |
| DELETE | `/forums/replies/{id}/helpful`  | Quitar el voto                                                        |
| PUT    | `/forums/threads/{id}/solution` | Autor del hilo: `{ replyId }` marca la mejor respuesta                |
| DELETE | `/forums/threads/{id}/solution` | Autor del hilo: quitarla                                              |

Cada respuesta trae `helpful`, `votedHelpful`, `isSolution`, `isMine` y `editedAt`.

## 3. Reportes

Se usa el mismo `POST /reports` de la Comunidad, con `targetType` = `forum_thread` o `forum_reply`. Con 3 reportes de personas distintas, el contenido se oculta hasta que soporte lo revise; su autor lo sigue viendo.

## 4. Avisos

| Tipo             | Quién lo recibe                      | `resource`                     |
| ---------------- | ------------------------------------ | ------------------------------ |
| `FORUM_REPLY`    | Quien abrió el hilo: le respondieron | `{ type: "forum_thread", id }` |
| `FORUM_SOLUTION` | Quien escribió la mejor respuesta    | `{ type: "forum_thread", id }` |

Ambos llegan por push y a la bandeja. Al tocarlos, abre el hilo.

## 5. Sugerencia de interfaz

- **Entrada:** una pestaña o sección «Foros», con chips de temas y la lista de hilos.
- **Preguntar:** botón flotante «Preguntar».
- **Hilo:** la pregunta arriba; la mejor respuesta resaltada con ✓; el botón «Me sirvió» en cada respuesta; el campo de respuesta abajo, deshabilitado si `locked`.
- **Mejor respuesta:** si `isMine`, cada respuesta muestra «Marcar como la mejor».
