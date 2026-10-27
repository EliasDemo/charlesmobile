# Recomendación por forma de cara en la app móvil

Para quien construye la app. El cliente escanea su cara **en el teléfono**, recibe los cortes que mejor le quedan con **fotos reales de caras parecidas cerca de él** y los **barberos que mejor dominan cada corte**. Sin IA en el servidor y **sin subir ni guardar la foto del cliente**.

> Toda librería nueva se aprueba antes de instalarse (origen oficial, licencia, mantenimiento). No instales un detector de rostro sin esa aprobación.

## 1. Privacidad (Ley 29733): obligatorio

- La forma de cara es un **dato biométrico (sensible)**. Antes de abrir la cámara, muestra un consentimiento claro: "Analizaremos tu cara **en tu teléfono** para sugerirte cortes. La foto no se sube ni se guarda." Botones "Acepto" / "Ahora no".
- La foto y los puntos de la cara **nunca salen del teléfono** ni se guardan. Al servidor solo viajan 4 medidas proporcionales (o la forma ya calculada).
- **"Recordar mi forma de cara"** es opcional y aparte: solo con una casilla de consentimiento explícita (ver §4). Debe poder borrarse.
- Presenta todo como **sugerencia**: muestra siempre `disclaimer` y, si hay `alternatives`, "Tu cara también podría ser…".

## 2. Escaneo en el teléfono (protocolo v2)

El clasificador está **calibrado con rostros reales medidos con este protocolo exacto**. Si la app mide distinto, el resultado se desvía: síguelo al pie de la letra.

1. **Cámara frontal con silueta guía**: de frente, sin lentes oscuros ni gorra, buena luz, cabello fuera de la frente si es posible.
2. **Calidad antes de medir** (con los datos del detector, en cada cuadro):
   - `headEulerAngleY` (giro) entre −15° y 15°, y `headEulerAngleX` (arriba/abajo) entre −20° y 20°. Si no, muestra "Mira de frente a la cámara".
   - Un solo rostro, y que ocupe al menos el 35 % del ancho de la imagen ("Acércate un poco").
3. **Endereza** el contorno de la cara (36 puntos): rota todos los puntos alrededor del centro de los ojos para que la línea entre los ojos quede horizontal (corrige `headEulerAngleZ`).
4. **Mide sobre el contorno enderezado** (es lo que ya hace `measureFace`, más el mentón). Con `top` y `bottom` = menor y mayor `y` del contorno, `L = bottom − top`, y "ancho a la altura h" = distancia en `x` entre el punto del contorno más cercano a `top + L·h` a cada lado del centro (promedio de las `x`):
   - `faceLength` = `L`;
   - `foreheadWidth` = ancho a 0,15;
   - `cheekboneWidth` = el mayor ancho entre 0,35, 0,40 y 0,45;
   - `jawWidth` = ancho a 0,80;
   - `chinWidth` = ancho a 0,90 (opcional pero recomendado: separa redonda de cuadrada y corazón de diamante).
5. **Promedia 5–10 cuadros válidos** (mediana de cada medida) antes de enviar.
6. Envía también `headPose` `{ yaw, pitch, roll }` (promedio de los cuadros). Si la cara no estaba de frente, el servidor responde 400 `headPose` / `frontalFace`: pide repetir.

Cualquier unidad sirve (píxeles): solo cuentan las proporciones. La foto y los puntos nunca salen del teléfono.

## 3. Endpoints

### Clasificar (opcional): `POST /face-shape/classify`

```json
{
  "faceLength": 118,
  "foreheadWidth": 95,
  "cheekboneWidth": 100,
  "jawWidth": 72,
  "chinWidth": 50,
  "headPose": { "yaw": 3.1, "pitch": -4.0, "roll": 1.2 }
}
```

→

```json
{
  "shape": "HEART",
  "confidence": 0.71,
  "certainty": "HIGH",
  "alternatives": [{ "shape": "OVAL", "probability": 0.18 }],
  "traits": [
    { "key": "POINTED_CHIN", "text": "Tu mentón termina en punta." },
    { "key": "NARROW_JAW", "text": "Tu mandíbula se afina hacia el mentón." }
  ],
  "modelVersion": 2
}
```

- `certainty`: `HIGH` (≥ 0,6), `MEDIUM` (≥ 0,4) o `LOW` (cara mixta). Con `LOW` no afirmes la forma: muestra "Tu cara está entre ovalada y redonda" con la alternativa principal.
- `traits`: muestra los rasgos como explicación ("Por qué"). Si se envió `faceShape` en vez de medidas, llega vacío. Medidas imposibles: 400 `VALIDATION_ERROR` (`measurements` / `plausibleFace`); cabeza girada: 400 (`headPose` / `frontalFace`). En ambos casos, pide repetir el escaneo.

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
