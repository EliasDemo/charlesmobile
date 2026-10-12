# Perfil de la cuenta en la app móvil

Para quien construye la app. Todo es de la cuenta autenticada: no existe una ruta para ver el perfil de otra persona.

## Consultar: `GET /users/me`

```json
{
  "id": "…",
  "fullName": "Ana Pérez",
  "email": "ana@example.com",
  "emailVerified": true,
  "phone": "+51 987 654 321",
  "roles": ["CLIENT"],
  "preferences": { "notificationChannels": ["PUSH", "EMAIL", "IN_APP"], "reminders": true },
  "birthDate": "1995-04-23",
  "gender": "FEMALE",
  "photoUrl": "/api/v1/media/img/…/square.webp",
  "createdAt": "2026-10-01T15:00:00.000Z"
}
```

`birthDate`, `gender` y `photoUrl` son `null` mientras la persona no los complete. `photoUrl` es **relativa** en desarrollo (súmale la URL base de la API) y absoluta en producción (CDN): úsala tal como llega si empieza con `http`.

## Editar: `PATCH /users/me`

Envía **solo** los campos que cambian. Omitir un campo lo deja igual; `null` lo borra (en `phone`, `birthDate` y `gender`).

| Campo         | Tipo                                                    | Reglas                                                                               |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `fullName`    | texto                                                   | 2 a 120 caracteres (se recortan los espacios).                                       |
| `phone`       | texto o `null`                                          | Dígitos, espacios, guiones, paréntesis y `+` inicial; 6 a 20 caracteres.             |
| `preferences` | objeto                                                  | `notificationChannels` (sin repetidos) y `reminders` opcional. Ver `PUSH.md`.        |
| `birthDate`   | `"YYYY-MM-DD"` o `null`                                 | Fecha real del calendario, desde 1900, con **18 años cumplidos** hoy (hora de Lima). |
| `gender`      | `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` o `null` | Uno de esos valores exactos.                                                         |

Responde 200 con el perfil completo (igual que `GET`).

**Errores** (400 `VALIDATION_ERROR`, con `details: [{ field, constraints }]`):

| `field` / `constraints`           | Mensaje sugerido en la app                        |
| --------------------------------- | ------------------------------------------------- |
| `birthDate` / `matches` (formato) | "Usa el formato día, mes y año." (envía ISO)      |
| `birthDate` / `validDate`         | "Esa fecha no existe."                            |
| `birthDate` / `minimumAge`        | "Debes tener al menos 18 años."                   |
| `gender` / `isEnum`               | Error de la app: enviar uno de los cuatro valores |
| `fullName`, `phone`               | Marcar el campo.                                  |

**Privacidad:** la fecha de nacimiento se guarda cifrada. Ni la fecha ni el género los ve nunca una barbería; sirven para un saludo o promoción de cumpleaños y para sugerir estilos. En la pantalla, márcalos como opcionales y ofrece "Prefiero no decirlo".

## Foto de perfil

- **Subir o reemplazar:** `PUT /users/me/photo`, `multipart/form-data` con el campo `file`.
  - JPEG, PNG o WebP de hasta 10 MB. HEIC no: conviértela en la app antes (ver `IMAGENES.md`).
  - El servidor la recorta a un **cuadrado de 512 px** (centrado en lo importante), quita los metadatos (EXIF y GPS) y la guarda en WebP. Recorta tú antes si quieres que la persona elija el encuadre.
  - Responde 200 `{ "photoUrl": "…" }`. La URL cambia en cada subida (no hace falta romper la caché).
- **Quitar:** `DELETE /users/me/photo` responde 200 `{ "photoUrl": null }`. Se puede llamar aunque no tenga foto.
- **Quién la ve:** la propia persona y las barberías donde tiene reservas (en su agenda y en el detalle de la reserva, campo `client.photoUrl`). Sin foto, muestra las iniciales.
- **Límite de subidas:** el mismo de todas las imágenes (por cuenta y por minuto; 429 `TOO_MANY_REQUESTS`).

| Error                       | HTTP | Qué hace la app                                    |
| --------------------------- | ---- | -------------------------------------------------- |
| `INVALID_IMAGE`             | 400  | "Esa imagen no se puede usar."                     |
| `VALIDATION_ERROR` (`file`) | 400  | Error de la app: no se envió el archivo.           |
| `PAYLOAD_TOO_LARGE`         | 413  | Comprimir antes de subir.                          |
| `TOO_MANY_REQUESTS`         | 429  | Esperar y reintentar.                              |
| `STORAGE_UNAVAILABLE`       | 503  | "No pudimos guardar la foto. Inténtalo más tarde." |

## Cambiar la contraseña: `POST /users/me/password`

```json
{ "currentPassword": "…", "newPassword": "…" }
```

- 204 sin cuerpo. **La sesión actual sigue**; las de los demás dispositivos se cierran y se envía un correo de aviso.
- La nueva cumple la misma política que el registro (10 a 128 caracteres y no ser una contraseña común) y debe ser distinta de la actual.

| Error                                                     | HTTP | Qué hace la app                                                            |
| --------------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| `WRONG_PASSWORD`                                          | 400  | Marcar "Contraseña actual". **No** es un 401: no cierres la sesión.        |
| `VALIDATION_ERROR` `newPassword` / `differentFromCurrent` | 400  | "La nueva contraseña debe ser distinta de la actual."                      |
| `VALIDATION_ERROR` `newPassword` (largo o común)          | 400  | Mostrar la política de contraseñas.                                        |
| `ACCOUNT_LOCKED`                                          | 429  | Demasiados intentos fallidos: "Espera unos minutos" (`retryAfterSeconds`). |

## Cerrar sesión en todos los dispositivos

Ya existe: `POST /auth/logout` con `{ "allDevices": true }` (ver `GUIA-API.md` §2). Después borra los tokens locales.
