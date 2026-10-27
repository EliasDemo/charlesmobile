# Notificaciones en la app móvil

Para quien construye la app. Estado al cierre de la Fase 10. Referencia del backend: CLAUDE.md §8, "Notificaciones (Fase 10)".

## Canales

- **Push** por Expo Push Service (un solo token para iOS y Android).
- **Bandeja en la app** (`IN_APP`): todo aviso queda aquí, aunque no llegue el push.
- **Correo**: hoy simulado (`FakeMailer`); en desarrollo se lee con `pnpm --filter api dev:mail <correo>`.

## Registrar el dispositivo

1. Pide el permiso de notificaciones y obtén el token con `expo-notifications` (`getExpoPushTokenAsync`). Requiere una **compilación de desarrollo**; Expo Go no sirve para push en Android desde SDK 53.
2. Tras iniciar sesión, y cada vez que la app arranca con sesión: `PUT /me/devices` con `{ pushToken, platform: "IOS" | "ANDROID", appVersion }`.
   - El token va **en el cuerpo**, nunca en la URL. El backend lo guarda cifrado y nunca lo devuelve.
   - Es idempotente: registrar el mismo token otra vez solo actualiza `lastSeenAt`. Responde `{ id, platform, appVersion, lastSeenAt }`; guarda el `id`.
3. Para dejar de recibir push en este dispositivo: `DELETE /me/devices/{id}`.
4. **Al cerrar sesión** el backend borra el dispositivo de esa sesión (y todos con `allDevices: true`, al cambiar la contraseña o si la cuenta se deshabilita). Al volver a iniciar sesión, regístralo de nuevo.
5. Máximo 10 dispositivos por cuenta: al pasarse se borran los menos usados. Si Expo informa que un token ya no es válido, el backend lo borra solo.

## Qué llega en el push

- **Nunca datos sensibles**: ni montos, ni nombres, ni motivos. Solo un título y "Toca para ver los detalles".
- `data` trae lo necesario para navegar:

```json
{ "type": "BOOKING_CONFIRMED", "resource": { "type": "booking", "id": "…" } }
```

| `resource.type` | Pantalla                                           |
| --------------- | -------------------------------------------------- |
| `booking`       | Detalle de la reserva (`GET /bookings/{id}`)       |
| `review`        | Valoración (en la barbería)                        |
| `ticket`        | Ticket de soporte (`GET /me/support/tickets/{id}`) |
| `barbershop`    | Panel de la barbería                               |
| `account`       | Ayuda / estado de la cuenta (`id` es `null`)       |
| `forum_thread`  | Hilo del foro (`GET /forums/threads/{id}`)         |

## Tipos de aviso

| Tipo                                              | Quién                                                                                      | Canales                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------- |
| `BOOKING_CONFIRMED`                               | Cliente                                                                                    | push, bandeja y correo           |
| `NEW_BOOKING`                                     | Barbero (push, bandeja y correo) y OWNER/MANAGER (push y bandeja)                          |                                  |
| `BOOKING_CANCELLED`                               | Cliente que canceló (push, bandeja y correo); barbero cuando cancela la barbería o soporte |                                  |
| `BOOKING_CANCELLED_BY_CLIENT`                     | Barbero, OWNER y MANAGER                                                                   | push y bandeja                   |
| `BOOKING_CANCELLED_BY_BARBERSHOP` / `_BY_SUPPORT` | Cliente, con el monto devuelto en bandeja y correo                                         | push, bandeja y correo (siempre) |
| `PAYMENT_REJECTED`, `BOOKING_EXPIRED`             | Cliente                                                                                    | push y bandeja (siempre)         |
| `NO_SHOW`                                         | Cliente                                                                                    | bandeja                          |
| `BOOKING_REMINDER`                                | Cliente, 24 h y 2 h antes                                                                  | push y bandeja                   |
| `REFUND_COMPLETED`, `REFUND_FAILED`               | Cliente                                                                                    | bandeja y correo (siempre)       |
| `NEW_REVIEW`                                      | OWNER y MANAGER                                                                            | bandeja                          |
| `SUPPORT_REPLY`                                   | Quien abrió el ticket                                                                      | push y bandeja                   |
| `ACCOUNT_DISABLED`                                | La cuenta                                                                                  | correo (siempre)                 |
| `BARBERSHOP_SUSPENDED`                            | OWNER y MANAGER                                                                            | bandeja y correo (siempre)       |
| `WAITLIST_SLOT_FREED`                             | Cliente en la lista de espera de esa franja (`resource.type` = `barbershop`)               | push y bandeja (urgente)         |
| `FORUM_REPLY`                                     | Quien abrió el hilo: le respondieron                                                       | push y bandeja                   |
| `FORUM_SOLUTION`                                  | Quien escribió la mejor respuesta                                                          | push y bandeja                   |

"Siempre" = avisos de seguridad y de pagos: se envían aunque la persona haya apagado ese canal.

## Horario silencioso y recordatorios

- Entre las 22:00 y las 08:00 (hora de la barbería) los push **no urgentes** esperan hasta las 08:00. Los urgentes (cancelación o confirmación de una cita de las próximas 24 h, pago rechazado) salen al momento. La bandeja y el correo no esperan.
- Los recordatorios (24 h y 2 h antes) que caerían en ese horario **se adelantan** al último momento permitido (21:59). Nunca se envía el recordatorio de una reserva cancelada o que ya empezó.

## Preferencias

`PATCH /users/me` con `preferences: { notificationChannels: ["PUSH", "IN_APP", "EMAIL"], reminders: true }`. Por defecto, todos los canales y los recordatorios activos.

## Bandeja

- `GET /me/notifications?unreadOnly=&limit=&cursor=`: los más recientes primero, con `resource` para navegar. Se conservan 90 días.
- `GET /me/notifications/unread-count` para el globo del ícono.
- `POST /me/notifications/{id}/read` y `POST /me/notifications/read-all`.

## En desarrollo

El backend usa `PUSH_DRIVER=fake`: los push no salen del servidor, se guardan en Redis (`fake-push:inbox`). Un token que contenga `Invalid` se trata como inválido. La bandeja (`GET /me/notifications`) sí funciona igual que en producción.
