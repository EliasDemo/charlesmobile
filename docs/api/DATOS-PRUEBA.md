# Datos de prueba (seed)

Datos ficticios que carga `pnpm --filter api prisma db seed` en la base de desarrollo, con IDs fijos (los mismos en cada instalación).

- **Contraseña:** todas las cuentas usan **el valor de la variable `SEED_USER_PASSWORD`** de `apps/api/.env` del backend. No se escribe aquí; pídela a quien mantiene el backend.
- **Correos:** los de las cuentas ya están verificados, así que pueden reservar.
- **El seed nunca se ejecuta en producción.**

## Usuarios

| Usuario          | Correo                         | ID                                     | Roles                                                                                  |
| ---------------- | ------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------- |
| Cliente Demo     | `cliente.demo@example.com`     | `01990000-0000-7000-8000-000000000001` | CLIENT                                                                                 |
| Responsable Demo | `responsable.demo@example.com` | `01990000-0000-7000-8000-000000000002` | OWNER, BARBER                                                                          |
| Barbero Demo     | `barbero.demo@example.com`     | `01990000-0000-7000-8000-000000000003` | BARBER                                                                                 |
| Soporte Demo     | `soporte.demo@example.com`     | `01990000-0000-7000-8000-000000000004` | SUPPORT y ADMIN (`/api/v1/admin`; ADMIN asignado con `admin:grant` solo en desarrollo) |

## Barberías

Las dos son de **Responsable Demo** (OWNER), con zona `America/Lima`.

- **Horario:** lunes a sábado de 09:00 a 20:00; el domingo está cerrada.
- **Barberos (los tres):** turno partido, de 09:00 a 13:00 y de 14:00 a 20:00.

| Barbería                 | ID                                     | Dirección                            | Lat, Lng           |
| ------------------------ | -------------------------------------- | ------------------------------------ | ------------------ |
| Barbería Demo Miraflores | `01990000-0000-7000-8000-000000000065` | Av. Ejemplo 123, Miraflores, Lima    | -12.1211, -77.0297 |
| Barbería Demo San Isidro | `01990000-0000-7000-8000-000000000066` | Calle Ficticia 456, San Isidro, Lima | -12.0977, -77.0365 |

Para la búsqueda, un punto cercano a ambas es `lat=-12.11&lng=-77.03`.

## Barberos

| Barbero          | ID                                     | Barbería   | Cuenta vinculada               |
| ---------------- | -------------------------------------- | ---------- | ------------------------------ |
| Responsable Demo | `01990000-0000-7000-8000-0000000000c9` | Miraflores | `responsable.demo@example.com` |
| Barbero Demo     | `01990000-0000-7000-8000-0000000000ca` | Miraflores | `barbero.demo@example.com`     |
| Barbero Invitado | `01990000-0000-7000-8000-0000000000cb` | San Isidro | Ninguna (perfil sin cuenta)    |

## Servicios

En cada barbería, todos los servicios los realizan sus barberos.

| Servicio      | Categoría       | Precio          | Duración | Miraflores      | San Isidro      |
| ------------- | --------------- | --------------- | -------- | --------------- | --------------- |
| Corte clásico | `haircut`       | 2500 (S/ 25,00) | 30 min   | `…00000000012d` | `…000000000130` |
| Corte y barba | `haircut_beard` | 4000 (S/ 40,00) | 45 min   | `…00000000012e` | `…000000000131` |
| Afeitado      | `shave`         | 2000 (S/ 20,00) | 20 min   | `…00000000012f` | `…000000000132` |

`…` = `01990000-0000-7000-8000-000000000`. Por ejemplo, el corte clásico de Miraflores es `01990000-0000-7000-8000-00000000012d`.

## Categorías de servicio

`GET /api/v1/service-categories` devuelve las nueve: `haircut`, `beard`, `haircut_beard`, `kids_haircut`, `hair_color`, `hair_treatment`, `shave`, `eyebrows` y `other`.

## Cuentas nuevas

Para probar el registro, usa cualquier correo inventado. En desarrollo el código de verificación no llega por correo: se lee en Redis (ver `GUIA-API.md` §1).

## Reservas a horas relativas (para probar la agenda y la asistencia)

`pnpm --filter api dev:booking --barber barbero.demo@example.com --start -20m --confirm`

- `--start`: inicio relativo a ahora (`-20m`, `+10m`, `-2h`, `-47h`, `0`). Admite horas pasadas: no pasa por la disponibilidad, pero sí por la restricción contra reservas solapadas.
- `--confirm`: confirma el pago como `dev:pay`. Sin él queda `PENDING_PAYMENT`.
- `--attended`: además la deja `ATTENDED` (para probar la corrección de las 48 h, por ejemplo con `--start -47h`).
- `--client <correo>` (por defecto `cliente.demo@example.com`) y `--service <id>` (por defecto el primer servicio del barbero).
- Solo desarrollo y pasarela simulada; queda auditado (`dev.booking_created`).

Ventanas para probar (valores por defecto):

| Acción                 | Desde                     | Hasta                   |
| ---------------------- | ------------------------- | ----------------------- |
| Marcar atendida        | el inicio                 | 24 h después            |
| No-show                | 15 min después del inicio | 24 h después            |
| Corregir (responsable) | —                         | 48 h después del inicio |
| Cancelar (barbería)    | —                         | antes del inicio        |

## Demo de Juliaca (Comunidad, saldo, empleos)

`pnpm --filter api dev:demo-juliaca --photos <carpeta> --confirm-wipe` **borra** la base de desarrollo y la llena con 10 barberías de Juliaca y 49 cuentas. Las fotos son de ejemplo, solo para la demo. La contraseña es la misma `SEED_USER_PASSWORD`; la tabla completa de cuentas se entrega aparte y nunca va al repositorio.

| Para probar                                                        | Entrar como                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Feed, comentarios, me gusta, guardados, membresía                  | `diego.quispe` (cliente; sigue barberías y tiene membresía en El Imperial)     |
| Publicar como barbería, comentario fijado, reportes de comentarios | `rolando.quispe` (dueño de Barbería El Imperial: promoción fijada y trabajos)  |
| Evento con cupo (15) y asistentes                                  | `kevin.mamani` (dueño de Fade House Juliaca)                                   |
| Evento sin cupo                                                    | `nilo.huaricallo` (Estilo Andino Barber)                                       |
| Publicar como perfil profesional                                   | `yeison.larico` (barbero independiente)                                        |
| Ofertas directas de trabajo                                        | `ruth.condori` (pendiente) y `kevin.torres` (rechazada)                        |
| Plan pagado con saldo a favor                                      | `wilber.ccama` (Barber Club Santa Bárbara)                                     |
| Revisar reportes en el panel web                                   | `admin.demo` → página **Comunidad** (hay un comentario de spam con 2 reportes) |

Para "Cerca de ti", usa el centro de Juliaca: `lat=-15.4975&lng=-70.1315`.
