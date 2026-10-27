# Lista de espera

Cuando no hay turno libre, el cliente se anota para un día (y, si quiere, una franja horaria y un barbero). Si una reserva de esa barbería se cancela o vence y el turno liberado cae en su franja, Charles le avisa con un push urgente para que reserve antes que otros.

## Endpoints (requieren sesión)

| Método   | Ruta                         | Uso                                                                              |
| -------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `POST`   | `/barbershops/{id}/waitlist` | Anotarse. Repetir la misma petición devuelve la misma inscripción (idempotente). |
| `GET`    | `/me/waitlist`               | Mis inscripciones (activas y avisadas).                                          |
| `DELETE` | `/me/waitlist/{entryId}`     | Salir de la lista (`204`; `404` si ya no existe).                                |

Cuerpo de `POST`:

```json
{
  "serviceId": "uuid",
  "date": "2026-11-03",
  "barberId": "uuid (opcional)",
  "fromMinute": 540,
  "toMinute": 720
}
```

- `date`: entre hoy y los próximos 30 días (hora de la barbería).
- `fromMinute` / `toMinute`: minutos desde la medianoche, hora local (540 = 09:00). Sin ellos, cualquier hora del día.
- Sin `barberId`: le sirve cualquier barbero.

Errores: `400` (día fuera de rango, franja inválida, servicio o barbero que no es de la barbería) y `409 CONFLICT` si ya tiene 5 listas activas.

## Estados

`ACTIVE` (esperando), `NOTIFIED` (ya se le avisó; la app debería llevarlo a reservar), `CANCELLED` (salió), `EXPIRED` (pasó el día).

## Aviso

Tipo `WAITLIST_SLOT_FREED`, push y bandeja, urgente. `resource` = `{ "type": "barbershop", "id": "<barbería>" }`: abrir la barbería para reservar. Se avisa a como máximo 3 personas por turno liberado, en orden de inscripción.

Sugerencia de interfaz: en la pantalla de horarios sin turnos, un botón «Avisarme si se libera un turno».
