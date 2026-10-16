# Promociones, destacados y anuncios en la app móvil (Fase 13)

Para quien construye la app. La administración (crear promociones de Charles, destacados y auspiciadores) está en la web de administración; aquí va lo que usa la app.

## 1. Descuento en la reserva

**Regla:** un solo descuento por reserva, el mayor entre las promociones que aplican (automáticas y la del cupón, si se envía). Nunca deja el total por debajo de S/ 1.00.

### Cotizar antes de reservar: `POST /bookings/quote`

```json
{
  "barbershopId": "…",
  "serviceId": "…",
  "startAt": "2030-01-07T17:00:00.000Z",
  "couponCode": "bienvenido10"
}
```

Responde 200 (no reserva el turno ni el cupo):

```json
{
  "subtotal": { "amount": 2500, "currency": "PEN" },
  "discountTotal": { "amount": 500, "currency": "PEN" },
  "feeTotal": { "amount": 0, "currency": "PEN" },
  "total": { "amount": 2000, "currency": "PEN" },
  "lines": [
    { "type": "SERVICE", "description": "Corte", "amount": { "amount": 2500, "currency": "PEN" } },
    {
      "type": "DISCOUNT",
      "description": "20 % los martes",
      "amount": { "amount": 500, "currency": "PEN" }
    },
    {
      "type": "FEE",
      "description": "Comisión de Charles",
      "amount": { "amount": 0, "currency": "PEN" }
    }
  ],
  "promotion": { "id": "…", "name": "20 % los martes" },
  "coupon": { "code": "BIENVENIDO10", "applied": false, "reason": "BETTER_PROMOTION" }
}
```

- `DISCOUNT` es **positivo** y se resta. Muestra "S/ 25.00 → S/ 20.00".
- `coupon` es `null` si no se envió código. Si se envió, `applied` y `reason`:

| `reason`           | Mensaje sugerido                                                       |
| ------------------ | ---------------------------------------------------------------------- |
| `null`             | "Cupón aplicado."                                                      |
| `NOT_FOUND`        | "Ese cupón no existe."                                                 |
| `NOT_ACTIVE`       | "Ese cupón no está vigente."                                           |
| `NOT_APPLICABLE`   | "Ese cupón no aplica a este servicio, barbería o día."                 |
| `EXHAUSTED`        | "Ese cupón ya no tiene usos disponibles."                              |
| `ALREADY_USED`     | "Ya usaste este cupón."                                                |
| `BETTER_PROMOTION` | "Ya tienes un descuento mejor; el cupón no se suma (uno por reserva)." |

### Reservar: `POST /bookings` con `couponCode` (opcional)

- El descuento definitivo se decide al reservar (el cupo puede haberse acabado entre la cotización y la reserva).
- Cupón que no se puede usar: **409 `COUPON_NOT_VALID`** con `details: [{ "reason": "…" }]` (mismos motivos de la tabla). No se crea la reserva: vuelve a cotizar.
- `BETTER_PROMOTION` no es error: se reserva con el descuento mayor.
- El precio de la reserva trae la línea `DISCOUNT` y `discountTotal`. Si la reserva se cancela o vence, el cupo vuelve a estar disponible.

### Promociones visibles de una barbería: `GET /barbershops/{id}/promotions/active`

Lista pública (sin sesión) de las promociones **automáticas** vigentes (de la barbería y de Charles): `name`, `type` (`PERCENTAGE` o `FIXED_AMOUNT`), `value` (porcentaje o céntimos), `serviceId` (null = todos), `daysOfWeek` (0 = domingo; vacío = todos), `endsAt` y `fromCharles`. Los cupones no aparecen.

### Promociones de la barbería (OWNER o MANAGER)

- `GET /barbershops/{id}/promotions`: todas, con `status` (`SCHEDULED`, `ACTIVE`, `PAUSED`, `ENDED`, `EXHAUSTED`), canjes y cupones.
- `POST /barbershops/{id}/promotions`: `name` (3–80), `type`, `value` (1–100 o 100–50000 céntimos), `serviceId?`, `startsAt?`, `endsAt?`, `maxRedemptions?`, `maxPerUser?`, `daysOfWeek?`, `requiresCoupon?`. La asume la barbería.
- `PATCH /barbershops/{id}/promotions/{promotionId}`: `name`, `endsAt`, `maxRedemptions`, `maxPerUser`, `isActive` (pausar). Tipo, valor y alcance no cambian: se crea otra.
- `POST …/{promotionId}/coupons` con `{ "code": "BIENVENIDO10" }` (4 a 20 letras o números, se guarda en mayúsculas; 409 `COUPON_CODE_TAKEN` si ya existe) y `DELETE …/coupons/{couponId}`.

## 2. Destacados en la búsqueda

Sin cambios de contrato: en `GET /search/barbershops`, `featured` puede ser `true`. Hasta 3 destacadas aparecen al inicio de la **primera página**, solo si cumplen los filtros. Muestra una etiqueta "Destacado".

## 3. Anuncios de auspiciadores

### Pedir los anuncios de un espacio: `GET /placements?slot=…` (sin sesión)

| `slot`            | Dónde va                          |
| ----------------- | --------------------------------- |
| `home_banner`     | Inicio del cliente                |
| `search_top`      | Arriba de los resultados          |
| `booking_success` | Pantalla de "reserva creada"      |
| `shop_dashboard`  | Pantalla principal de la barbería |

Responde hasta 3 anuncios (`id`, `title`, `imageUrl`, `actionUrl`, `sponsorId`, `sponsorName`, `sponsorLogoUrl`). Lista vacía: no muestres el espacio. Marca el anuncio como **"Publicidad"**.

### Registrar impresión y clic: `POST /placements/{id}/events`

```json
{ "type": "IMPRESSION", "viewerKey": "uuid-de-la-instalación" }
```

- `IMPRESSION` cuando el anuncio se ve; `CLICK` al tocarlo (luego abre `actionUrl` en el navegador).
- Con sesión no hace falta `viewerKey`. Sin sesión es obligatorio: un UUID que la app genera **una vez** y guarda. No se guarda la IP.
- Responde 204; los repetidos en la misma hora se ignoran (no hace falta controlarlo en la app).

### Catálogo del auspiciador: `GET /sponsors/{id}`

Nombre, logo y productos (`name`, `description`, `imageUrl`, `priceText`, `actionUrl`). **Charles no vende ni cobra**: "Comprar" abre `actionUrl` (https) fuera de la app.
