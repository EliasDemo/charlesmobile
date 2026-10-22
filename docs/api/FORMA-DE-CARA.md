# Recomendación por forma de cara en la app móvil (Etapa 1)

Para quien construye la app. El cliente escanea su cara **en el teléfono**, recibe los cortes que mejor le quedan con **fotos reales de caras parecidas cerca de él** y los **barberos que mejor dominan cada corte**. Sin IA en el servidor y **sin subir ni guardar la foto del cliente**.

> Toda librería nueva se aprueba antes de instalarse (origen oficial, licencia, mantenimiento). No instales un detector de rostro sin esa aprobación.

## 1. Privacidad (Ley 29733): obligatorio

- La forma de cara es un **dato biométrico (sensible)**. Antes de abrir la cámara, muestra un consentimiento claro: "Analizaremos tu cara **en tu teléfono** para sugerirte cortes. La foto no se sube ni se guarda." Botones "Acepto" / "Ahora no".
- La foto y los puntos de la cara **nunca salen del teléfono** ni se guardan. Al servidor solo viajan 4 medidas proporcionales (o la forma ya calculada).
- **"Recordar mi forma de cara"** es opcional y aparte: solo con una casilla de consentimiento explícita (ver §4). Debe poder borrarse.
- Presenta todo como **sugerencia**: muestra siempre `disclaimer` y, si hay `alternatives`, "Tu cara también podría ser…".

## 2. Escaneo en el teléfono

1. Pantalla de cámara frontal con **silueta guía**: de frente, sin lentes oscuros ni gorra, buena luz, cabello fuera de la frente si es posible.
2. Con el detector de rostro aprobado, toma los puntos del **contorno de la cara** y calcula:
   - `faceLength`: del borde superior de la frente (o la línea del cabello) al mentón;
   - `foreheadWidth`: ancho de la frente (a la altura de las sienes);
   - `cheekboneWidth`: ancho máximo entre pómulos;
   - `jawWidth`: ancho de la mandíbula a la altura de sus ángulos.
     Cualquier unidad (píxeles sirve): solo cuentan las proporciones.
3. Promedia 5–10 cuadros estables antes de enviar (reduce el ruido).

## 3. Endpoints

### Clasificar (opcional): `POST /face-shape/classify`

```json
{ "faceLength": 140, "foreheadWidth": 92, "cheekboneWidth": 100, "jawWidth": 80 }
```

→ `{ "shape": "OVAL", "confidence": 0.82, "alternatives": [{ "shape": "ROUND", "probability": 0.15 }] }`. Medidas imposibles: 400 `VALIDATION_ERROR` (`measurements` / `plausibleFace`): pide repetir el escaneo.

Formas: `OVAL` (ovalada), `ROUND` (redonda), `SQUARE` (cuadrada), `OBLONG` (alargada), `HEART` (corazón), `DIAMOND` (diamante).

### Recomendar: `POST /recommendations/haircuts` (con o sin sesión)

```json
{
  "measurements": { "faceLength": 140, "foreheadWidth": 92, "cheekboneWidth": 100, "jawWidth": 80 },
  "hairType": "WAVY",
  "vibe": "MODERN",
  "maintenance": "LOW",
  "lat": -12.12,
  "lng": -77.03,
  "radiusKm": 5
}
```

- En lugar de `measurements` puede ir `faceShape`. Si no va ninguno y hay sesión con forma guardada, se usa esa; si no, 400 (`faceShape` / `faceShapeOrMeasurements`).
- Opcionales: `hairType` (`STRAIGHT` lacio, `WAVY` ondulado, `CURLY` rizado, `COILY` afro: descarta cortes que no funcionan con ese cabello), `vibe` (`CLASSIC`/`MODERN`), `maintenance` (`LOW`/`MEDIUM`/`HIGH`), `radiusKm` (1–50).
- La ubicación solo se usa en esa petición.

Respuesta:

- `faceShape`: forma, confianza y alternativas.
- `haircuts` (hasta 5, de mayor a menor `compatibility` 0–100): `style` (id, key, name), `description`, `maintenance`, `reason` (por qué le queda), `ruleValidated` (si es false, la regla aún no la revisaron barberos: no lo menciones como "garantizado").
  - `photos` (hasta 6): fotos reales cercanas, primero de **caras de la misma forma** (`sameFaceShape`), luego confirmadas por el barbero (`confirmed`). Si `isDemo` es true, muestra la etiqueta **"Ejemplo"** (es una foto de demostración, no un trabajo real). `serviceId` permite "Reservar este corte".
  - `barbers` (hasta 3): los mejores en ese corte cerca, con `summary` listo para mostrar ("23 trabajos de este corte en caras ovaladas · 4,9 ★ · a 1,2 km"), `barberProfileId` (perfil de carrera), `barbershopId` y `barberId` (para reservar con él).
- `disclaimer`: muéstralo siempre en la pantalla de resultados.

### Reservar el corte elegido

`POST /bookings` acepta `styleId` (el `style.id` del corte). Envíalo cuando la reserva nace de una recomendación o de una foto: así se miden las estrellas del barbero **en ese corte**. Estilo inexistente: 400 (`styleId` / `activeStyle`).

## 4. Recordar mi forma de cara (opcional)

`PATCH /users/me` con `{ "faceShape": "OVAL", "faceShapeConsent": true }`. Sin `faceShapeConsent: true`: 400 (`faceShapeConsent` / `isTrue`). `{ "faceShape": null }` la borra. `GET /users/me` trae `faceShape`.

## 5. Barbería y barbero: etiquetar sus cortes

Al subir o editar un corte (galería `POST /barbershops/{id}/barbers/{barberId}/gallery`, `PATCH …/gallery/{imageId}`, o portafolio `POST /me/barber-profile/portfolio`), agrega el selector **"Forma de cara de la persona"** (`faceShape`, opcional) junto a los estilos. Con al menos un estilo, la foto queda **confirmada** (`labelConfirmed: true`) y cuenta para el ranking del barbero en ese corte y para las recomendaciones. El consentimiento de la persona fotografiada ahora incluye que **su foto se use para recomendar cortes**: actualiza el texto de la casilla.

## 6. Catálogo de cortes

`GET /service-styles?category=haircut` trae ahora `description`, `maintenance`, `hairTypes` y `vibe` de cada corte: úsalos en la ficha del corte y en los filtros de preferencias.

## Errores

Todos con el formato de `GUIA-API.md`: decide por `code` y `details`, nunca por el texto.
