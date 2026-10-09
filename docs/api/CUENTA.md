# Eliminación de cuenta en la app móvil

Para quien construye la app. Apple (App Store Review Guideline 5.1.1(v)) y Google Play exigen que la persona pueda eliminar su cuenta desde la app. Referencia del backend: CLAUDE.md §8, "Eliminación de cuenta".

## Resumen

1. La persona revisa qué pasará (vista previa) y confirma con su contraseña.
2. Al confirmar se cancelan sus reservas activas (con la política de devolución normal), se cierran sus tickets y **todas sus sesiones**.
3. La cuenta queda **pendiente** 30 días (configurable). En ese plazo solo puede consultar o **cancelar** la eliminación.
4. Al vencer, se borran o anonimizan sus datos personales. Es irreversible.

## Pantalla "Eliminar mi cuenta" (en Perfil)

1. `GET /me/account/deletion/preview` devuelve:
   - `canRequest`: si se puede solicitar ahora;
   - `blockers`: lo que lo impide, con `reason`:
     - `SOLE_OWNER`: es el único OWNER de `barbershopName`. Debe transferir la propiedad o eliminar la barbería antes.
     - `STAFF_ROLE`: cuenta de soporte o ADMIN.
   - `bookings`: las reservas que se cancelarán y, por cada una, `refund` (monto, porcentaje y regla): la **misma** cifra que la vista previa de cancelación. Muestra sus horas en `barbershop.timezone`. Avisa que **no se restauran** si después se arrepiente.
   - `graceDays` y `scheduledForIfRequestedNow`: la fecha en que se eliminaría.
2. Pide la contraseña y llama a `POST /me/account/deletion` con `{ password }`.
   - 200 con `{ pending: true, requestedAt, scheduledFor }`.
   - 401 `INVALID_CREDENTIALS`: contraseña incorrecta.
   - 409 `DELETION_BLOCKED` con los bloqueos en `details`.
3. **Después del 200 la sesión ya no sirve**: borra los tokens guardados y vuelve a la pantalla de inicio con un mensaje del tipo "Tu cuenta se eliminará el {fecha}. Te enviamos un correo".

## Arrepentirse (dentro del plazo)

- El inicio de sesión normal responde 403 `ACCOUNT_PENDING_DELETION`.
- Ante ese código, llama a `POST /auth/support-access` con el mismo correo y contraseña. Responde un token restringido con `scope: "deletion"`.
- Con ese token solo funcionan:
  - `GET /me/account/deletion`: estado y fecha;
  - `DELETE /me/account/deletion`: cancela la eliminación.
- Cualquier otro endpoint responde 403 `ACCOUNT_PENDING_DELETION`. Muestra una pantalla con la fecha y el botón "Cancelar eliminación".
- Después de cancelar, inicia sesión normalmente (`POST /auth/login`).

## Cuenta deshabilitada por soporte

`POST /auth/support-access` responde con `scope: "support"`. Con ese token, además de sus tickets, puede usar `GET /me/account/deletion/preview` y `POST /me/account/deletion`. Si una cuenta deshabilitada se elimina, ese correo no puede registrarse de nuevo durante 12 meses (el registro responde igual, sin crear la cuenta).

## Correos

La persona recibe un correo al solicitar, un recordatorio 3 días antes, uno si cancela y uno final al ejecutarse.

## Qué se conserva

Por obligación legal o contable se conservan, sin datos que la identifiquen: reservas, pagos, reembolsos y la auditoría. De sus valoraciones queda solo la puntuación ("Cuenta eliminada", sin el comentario).
