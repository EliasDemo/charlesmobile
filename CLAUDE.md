# CHARLES MOBILE — Guía del proyecto para Claude Code

App móvil de Charles (reservas para barberías) para **Android e iOS**, con un solo código. Consume la API del backend, que vive en otro proyecto: `..\charles`.

Este archivo es la fuente de verdad de la app. El contrato de la API está en **`docs/api/`** (`GUIA-API.md`, `openapi.json`, `DATOS-PRUEBA.md`, `PAGOS.md`, `AJUSTES-BACKEND.md`), que es una copia de `..\charles\docs\mobile\`.

- `docs/api/` **nunca se edita a mano.** Solo la actualiza `pnpm sync:api`, que copia la carpeta completa desde `..\charles\docs\mobile\` y regenera los tipos.
- Del proyecto `..\charles` no se lee ni se modifica nada más; esa copia la hace únicamente `pnpm sync:api`.
- `pnpm verify` falla si los tipos generados no coinciden con `docs/api/openapi.json`.

---

## 1. Cómo debes trabajar

1. Trabaja **una fase a la vez** (sección 10). No adelantes fases.
2. Antes de escribir código en cada fase, presenta las preguntas, el plan y la lista de pantallas, y espera aprobación.
3. **Nunca leas ni edites nada dentro de `..\charles`.** La documentación de la API se lee en `docs/api/`. Si la app necesita un cambio en el backend, descríbelo y detente: lo pide el usuario en la otra conversación.
4. **El backend manda.** La app no calcula precios, devoluciones, disponibilidad, permisos ni estados. Muestra lo que la API responde. Las acciones permitidas salen de los campos que da la API (por ejemplo `canMarkAttended`), no de reglas copiadas en la app.
5. Nunca escribas a mano un tipo de la API. Se generan con `pnpm sync:api`.
6. No inventes endpoints ni campos. Si algo no está en `docs/api/openapi.json`, pregunta.
7. Ningún commit sin que `pnpm verify` pase.
8. Código en **inglés**. Todo texto visible al usuario en **español**, en archivos de traducción, nunca escrito dentro de los componentes.
9. Sin secretos en el repositorio ni dentro de la app. Todo lo que va en la app es público por definición.
10. Al terminar una fase: resume qué se hizo, qué pantallas quedaron, qué falta, y actualiza `docs/ESTADO.md`. En una conversación nueva, lee primero ese archivo.
11. Claude Code no puede ver la app en un teléfono. Al cerrar cada fase entrega una **lista de comprobación manual** para que el usuario la pruebe en su dispositivo, y corrige según lo que reporte.
12. **Nada que exija recompilar sin aprobación.** Antes de agregar un módulo nativo, o de cambiar `app.config.ts`, `eas.json`, `plugins/` o cualquier otra cosa que requiera una compilación nueva, avisa y espera la aprobación del usuario: la cola gratuita de EAS puede tardar horas. Los cambios nativos aprobados se acumulan en `docs/ESTADO.md` ("Cambios nativos pendientes de compilar") para hacer una sola compilación. El código debe funcionar sin errores en la compilación instalada hasta entonces: si depende de un módulo nativo nuevo, lo carga solo si existe (`requireOptionalNativeModule`).

---

## 2. Stack

| Tema                   | Elección                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Base                   | React Native con **Expo**, nueva arquitectura activada                                                            |
| Lenguaje               | TypeScript en modo `strict`                                                                                       |
| Ejecución              | **Compilación de desarrollo** (`expo-dev-client` + EAS Build). No se usa Expo Go: el SDK de pagos no funciona ahí |
| Navegación             | Expo Router (rutas por archivos)                                                                                  |
| Datos del servidor     | TanStack Query                                                                                                    |
| Estado local de la app | Zustand, solo para sesión y preferencias de interfaz                                                              |
| Cliente de API         | `openapi-typescript` + `openapi-fetch`, generado desde `openapi.json`                                             |
| Formularios            | React Hook Form + Zod                                                                                             |
| Almacenamiento seguro  | `expo-secure-store` (Keychain / Keystore)                                                                         |
| Mapas y ubicación      | `react-native-maps` + `expo-location`                                                                             |
| Notificaciones         | `expo-notifications`                                                                                              |
| Pagos                  | `@lyracom/react-native-sdk-payment-module` (Izipay), detrás de una interfaz propia                                |
| Textos                 | `i18next`, idioma español; preparado para agregar otros                                                           |
| Pruebas                | Jest + React Native Testing Library; flujos completos con Maestro                                                 |
| Gestor de paquetes     | pnpm                                                                                                              |

Usa las últimas versiones **estables** compatibles entre sí. El SDK de Izipay exige React Native 0.77 o superior. Fija versiones exactas y documenta las elegidas en `docs/adr/0001-base-tecnica.md`.

---

## 3. Arquitectura

**Por funcionalidades, con tres capas (variante de MVVM).** Cada funcionalidad es una carpeta autónoma; dentro, el código se separa por responsabilidad:

| Capa                        | Equivale a | Contiene                                                                                        | No puede                                          |
| --------------------------- | ---------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Pantallas y componentes** | Vista      | Solo interfaz: muestran datos y emiten acciones                                                 | Llamar a la API, guardar datos, contener reglas   |
| **Hooks**                   | ViewModel  | Estado de la pantalla, consultas y mutaciones, validación de formularios, traducción de errores | Renderizar, conocer detalles de navegación ajenos |
| **API y modelos**           | Modelo     | Llamadas tipadas al backend y adaptadores de datos                                              | Depender de React ni de la interfaz               |

Reglas de dependencia:

- La dirección es única: pantalla → hook → API. Nunca al revés.
- Una funcionalidad no importa archivos internos de otra; solo lo que esta exporta en su `index.ts`.
- Lo compartido vive en `shared/`. `shared/` no importa de `features/`.
- `app/` solo define rutas y delega en las pantallas de cada funcionalidad.
- Una regla de ESLint debe hacer cumplir estos límites.

### Estructura

```
charlesmobile/
├── CLAUDE.md
├── docs/                    # ESTADO.md, adr/, pendientes-publicacion.md
│   └── api/                 # copia de ..\charles\docs\mobile\ (solo la escribe sync:api)
├── app/                     # rutas (Expo Router)
│   ├── (public)/            # explorar sin sesión
│   ├── (auth)/              # registro, inicio de sesión, recuperación
│   ├── (client)/            # reservas, favoritos, perfil
│   ├── (staff)/             # agenda y gestión de barbería
│   └── _layout.tsx
├── src/
│   ├── features/
│   │   └── <feature>/
│   │       ├── api/         # llamadas tipadas y claves de consulta
│   │       ├── hooks/       # lógica de pantalla (ViewModel)
│   │       ├── components/  # componentes propios de la funcionalidad
│   │       ├── screens/     # pantallas
│   │       ├── schemas/     # validaciones Zod
│   │       └── index.ts     # lo único que otros pueden importar
│   └── shared/
│       ├── api/             # cliente, tipos generados, manejo de errores, sesión
│       ├── ui/              # sistema de diseño: botones, campos, tarjetas...
│       ├── theme/           # colores, tipografía, espaciado (tokens)
│       ├── i18n/            # textos en español
│       ├── config/          # variables de entorno validadas
│       ├── lib/             # fechas, dinero, utilidades puras
│       └── payments/        # interfaz de pago y adaptadores
└── e2e/                     # flujos de Maestro
```

Funcionalidades previstas: `auth`, `profile`, `search`, `barbershop`, `availability`, `booking`, `payment`, `shop-management`, `agenda`, `notifications`, `favorites`, `reviews`, `support`, `gallery`.

### Comandos

```
pnpm install
pnpm sync:api        # copia ..\charles\docs\mobile\ completa a docs/api/ y regenera los tipos
pnpm start           # servidor de desarrollo (requiere la compilación de desarrollo instalada)
pnpm verify          # lint, typecheck, formato, pruebas y falla si los tipos no coinciden con docs/api/openapi.json
pnpm check:api       # solo la comprobación de tipos (parte de verify)
eas build --profile development --platform android   # compilación de desarrollo (solo si cambió algo nativo)
```

---

## 4. Conexión con el backend

- URL base desde `EXPO_PUBLIC_API_URL`, validada al arrancar: es **solo el origen** (`http://IP:3000`), sin `/api/v1`, porque las rutas de `openapi.json` ya lo incluyen. Se entrega `.env.example`.
- En desarrollo el teléfono se conecta al backend por la IP local de la computadora, en la misma red wifi. Sigue `docs/api/GUIA-API.md`.
- Un único cliente de API en `shared/api`. Ninguna pantalla usa `fetch` directamente.
- **Errores:** el backend responde `{ code, message, details, requestId }`. La app decide por `code`, nunca por el texto. Un solo traductor convierte cada `code` en un mensaje en español; un código desconocido muestra un mensaje genérico con el `requestId`.
- **Reintentos:** un 503 con `retryable: true` y los fallos de red se reintentan con espera creciente. Un 429 respeta el tiempo de espera indicado. Los 4xx no se reintentan.
- **Paginación:** por cursor, con listas infinitas.
- **Fechas:** la API entrega UTC. La app muestra siempre la hora **en la zona de la barbería**, no en la del teléfono.
- **Dinero:** llega en céntimos con su moneda. Un único formateador lo muestra. La app nunca suma, resta ni aplica porcentajes.
- **Idempotency-Key:** al crear una reserva o un pago se genera una clave por intento del usuario, y **se reutiliza la misma** si esa petición se reintenta.

---

## 5. Sesión y seguridad

- Tokens **solo** en `expo-secure-store`. Nunca en AsyncStorage, en el estado persistido ni en logs.
- El token de acceso dura 15 minutos y el de renovación rota en cada uso. La renovación es **de vuelo único**: si varias peticiones reciben 401 a la vez, se renueva una sola vez y las demás esperan. Renovar dos veces en paralelo se interpreta en el backend como robo de sesión y cierra todas las sesiones.
- Si la renovación falla, se borra la sesión y se lleva al inicio de sesión conservando la pantalla de destino.
- Al cerrar sesión: se revoca en el servidor, se borran tokens, caché de consultas y el registro de notificaciones del dispositivo.
- Solo HTTPS fuera de desarrollo. Tráfico en claro deshabilitado en las compilaciones de producción.
- Fijación de certificado antes de publicar (fase M11).
- No registrar datos personales, tokens, coordenadas ni cuerpos de pago. Los informes de fallos se envían sin esos datos.
- **Ubicación:** se pide solo cuando el usuario busca por cercanía, con una explicación previa. Si la niega, la búsqueda sigue funcionando por texto. No se guarda.
- **Tarjetas:** la app nunca ve ni maneja datos de tarjeta. Los captura el SDK de Izipay.
- Bloquear capturas de pantalla no es obligatorio; no mostrar datos sensibles en las notificaciones sí lo es.
- Las pantallas protegidas comprueban la sesión y el rol, pero la autorización real es del backend: un 403 o 404 se maneja con elegancia.

---

## 6. Interfaz y experiencia

- **Sistema de diseño propio** en `shared/ui` y `shared/theme`: colores, tipografía, espaciado y componentes base definidos una vez. Las pantallas no usan colores ni tamaños sueltos.
- Tema claro y oscuro desde el inicio.
- Toda pantalla con datos maneja cuatro estados: **cargando, vacío, error y con datos**. Ninguna pantalla queda en blanco.
- Estado sin conexión: aviso visible y reintento; se muestran los datos en caché cuando existan.
- Accesibilidad: etiquetas para lectores de pantalla, áreas táctiles de al menos 44 puntos, contraste suficiente y respeto del tamaño de letra del sistema.
- Formularios: validación al salir del campo, errores junto al campo, teclado adecuado al tipo de dato y botón deshabilitado mientras se envía.
- Acciones irreversibles (cancelar una reserva, cerrar sesión en todos los dispositivos) piden confirmación y muestran sus consecuencias, por ejemplo el monto que se devolverá.
- Las diferencias entre Android e iOS se resuelven en `shared/ui`, no en cada pantalla.

---

## 7. Roles y navegación

- **Sin sesión:** explorar, buscar, ver barberías y turnos. La cuenta se pide recién al reservar.
- **Cliente:** reservas, favoritos, valoraciones, perfil.
- **Barbero:** su agenda, sus bloqueos, marcar asistencia.
- **Responsable:** gestión de la barbería y agenda completa.

Un usuario puede tener varios roles. La app ofrece cambiar entre modo cliente y modo barbería, y decide qué mostrar con los roles del token y las membresías que devuelve la API.

---

## 8. Pagos

- Una interfaz propia `PaymentProvider` en `shared/payments`, con un adaptador para Izipay. Ninguna pantalla llama al SDK directamente.
- Flujo: el backend crea el pago y devuelve `formToken` y clave pública → la app abre el SDK → la app reenvía el resultado al backend para que lo verifique → la app **consulta el estado de la reserva** hasta que sea `CONFIRMED` o falle.
- La app **nunca** da una reserva por confirmada por lo que diga el SDK. Solo vale el estado que devuelve el backend.
- La reserva pendiente muestra una cuenta regresiva hasta `expiresAt`. Si vence, se explica y se ofrece reservar de nuevo.
- Si el usuario cierra la app a mitad del pago, al volver se consulta el estado y se continúa donde corresponda.
- Detalles en `docs/api/PAGOS.md`.

---

## 9. Pruebas

- Unitarias para hooks, adaptadores, formateadores y el traductor de errores.
- De componentes para cada pantalla: sus cuatro estados y sus validaciones.
- Las pruebas simulan la API a partir de los tipos generados; no dependen de un backend encendido.
- Flujos completos con Maestro contra el backend local para los recorridos críticos: registro e inicio de sesión, buscar y reservar, cancelar, marcar asistencia.
- Pruebas obligatorias de sesión: renovación de vuelo único, cierre de sesión que limpia todo, y 401 que redirige.
- Cobertura mínima del 80 % en `shared/api`, `shared/payments` y en los hooks de `auth` y `booking`.

---

## 10. Fases de construcción

| Fase    | Entregable                                                                                                                                                                         | Depende del backend |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **M1**  | Base: proyecto, compilación de desarrollo en Android, navegación, sistema de diseño, cliente de API con `sync:api`, configuración validada, manejo de errores, i18n, `pnpm verify` | Listo               |
| **M2**  | Cuenta: registro, verificación de correo, inicio y cierre de sesión, recuperación, perfil y preferencias                                                                           | Listo               |
| **M3**  | Explorar: búsqueda por texto y cercanía, mapa, filtros, categorías, detalle de barbería, barberos, servicios, horarios, alternativas                                               | Listo               |
| **M4**  | Reservar: turnos por fecha, elegir barbero o cualquiera, resumen, crear reserva, cuenta regresiva, mis reservas, cancelar con vista previa de devolución                           | Listo               |
| **M5**  | Pagar con Izipay                                                                                                                                                                   | Fase 8B             |
| **M6**  | Gestión de barbería: crear barbería o perfil independiente, servicios, barberos, invitaciones, horarios, bloqueos, estado de atención                                              | Listo               |
| **M7**  | Agenda y atención: agenda del día para barbero y responsable, marcar asistencia y no-show, correcciones                                                                            | Listo               |
| **M8**  | Notificaciones: push, bandeja y preferencias                                                                                                                                       | Fase 10             |
| **M9**  | Favoritos, valoraciones y soporte                                                                                                                                                  | Fases 11 y 12       |
| **M10** | Galería de trabajos y perfiles con fotos                                                                                                                                           | Fase 14             |
| **M11** | Preparar la publicación: fijación de certificado, rendimiento, accesibilidad, iconos, permisos, políticas de las tiendas y compilación para iOS                                    | —                   |
| Después | Promociones y cupones, planes de barbería, membresías                                                                                                                              | Fases 13, 15 y 16   |

Las fases M5, M8, M9 y M10 esperan a su fase del backend. Mientras tanto se avanza con las que ya están listas; el orden puede alterarse entre fases que no dependen entre sí.

### Una fase está terminada cuando

- Todas sus pantallas manejan cargando, vacío, error y datos.
- `pnpm verify` pasa sin advertencias.
- No hay textos visibles fuera de los archivos de traducción, ni colores o tamaños fuera del tema.
- Se revisó la sección 5 para el código nuevo.
- Se entregó la lista de comprobación manual y el usuario confirmó que funciona en su teléfono.
- `docs/ESTADO.md` está actualizado.
