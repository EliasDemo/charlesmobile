# Nombre de usuario: cambios del contrato para la app móvil

Para el equipo de la app. Antes de empezar, ejecuta `pnpm sync:api`.

## 1. Registro: `POST /auth/register`

- Campo nuevo **obligatorio**: `username`.
- Reglas:
  - de 3 a 20 caracteres;
  - solo minúsculas, números, punto (`.`) y guion bajo (`_`);
  - no puede empezar ni terminar en `.` o `_`, ni llevar dos de esos signos seguidos.
- Conviértelo a minúsculas antes de enviarlo.
- `fullName` es el nombre real y ya no se muestra en público. En el formulario, pon una nota bajo el campo: "Solo lo ve tu barbería".
- Mientras la persona escribe el usuario, consulta `GET /auth/username-available?username=…`. Espera unos 400 ms desde la última tecla antes de enviar la consulta. La respuesta es `{ available, reason }`:

  | `reason`   | Texto sugerido                                    |
  | ---------- | ------------------------------------------------- |
  | `null`     | ✓ Disponible                                      |
  | `TAKEN`    | "Ya está en uso"                                  |
  | `RESERVED` | "Ese nombre no está permitido"                    |
  | `INVALID`  | "3 a 20: minúsculas, números, punto o guion bajo" |

- Errores posibles al enviar el registro:
  - **409 `USERNAME_TAKEN`**: marcar el campo con "Ese usuario ya está en uso".
  - **400 `VALIDATION_ERROR`** con `field: "username"`: marcar el campo.

## 2. Inicio de sesión: `POST /auth/login`

- Envía `{ login, password }`. `login` es el usuario **o** el correo; si lleva "@" se toma como correo.
- Rotula el campo "Usuario o correo".
- `{ email, password }` sigue funcionando por ahora, pero está obsoleto: cámbialo.
- Nuevo texto para `INVALID_CREDENTIALS`: "Usuario, correo o contraseña incorrectos."
- La respuesta incluye ahora `user.username`.

## 3. Perfil: `GET` y `PATCH /users/me`

- `GET` devuelve dos campos nuevos:
  - `username`;
  - `usernameChangeableAt`: fecha desde la que se puede volver a cambiar el usuario. Es `null` cuando ya se puede cambiar.
- `PATCH` acepta `username`, que solo se puede cambiar **una vez cada 30 días**.
  - Si `usernameChangeableAt` es una fecha futura, deshabilita el campo y muestra "Podrás cambiarlo el {fecha}".
  - **409 `USERNAME_CHANGE_TOO_SOON`**: trae la fecha en `details[0].nextChangeAt`.
  - **409 `USERNAME_TAKEN`**: el usuario ya está en uso.
- Muestra el usuario como `@ana.perez` en la pantalla de perfil.

## 4. Nombres que ahora son el usuario (no cambia la forma, solo el contenido)

| Dónde                                          | Campo                     | Antes       | Ahora                          |
| ---------------------------------------------- | ------------------------- | ----------- | ------------------------------ |
| Valoraciones de barbería o barbero             | `authorName`              | "Ana R."    | `ana.perez`                    |
| Valoraciones del perfil profesional            | `clientName`              | "Ana"       | `ana.perez`                    |
| Mensajes enviados por el cliente               | `senderName`              | "Ana"       | `ana.perez`                    |
| Conversación vista desde la barbería (persona) | nombre de la contraparte  | "Ana"       | `ana.perez · Ana`              |
| Agenda y reservas vistas desde la barbería     | `client.name`             | "Ana Pérez" | "Ana" (solo el nombre de pila) |
| Agenda y reservas vistas desde la barbería     | `client.username` (nuevo) | —           | `ana.perez`                    |

Sugerencia: en las valoraciones y en los mensajes, pon `@` delante del usuario.

## 5. Códigos de error nuevos

- `USERNAME_TAKEN` (409)
- `USERNAME_CHANGE_TOO_SOON` (409)

Las cuentas que ya existían recibieron un usuario automático, como `franck.913c`, y la persona puede cambiarlo de inmediato desde su perfil.
