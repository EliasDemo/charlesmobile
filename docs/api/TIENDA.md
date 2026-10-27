# Tienda (marcas auspiciadoras y descuentos)

Escaparate de las marcas que pagan por aparecer en Charles: ofertas, productos, marcas por rubro y videos cortos, más los descuentos en reservas. Todas las rutas van bajo `/api/v1`. El contrato exacto está en `openapi.json` (etiqueta `sponsors`).

- **Charles no vende ni cobra:** cada producto enlaza (`actionUrl`, https) a la tienda de la marca. Ábrelo en el navegador externo.
- **Siempre es publicidad:** muestra la etiqueta «Patrocinado» en todo lo que venga de una marca.
- **Nunca en la Comunidad ni en los Foros:** esas secciones son contenido de personas. La publicidad vive en la Tienda y en los espacios de anuncios.
- **Montos:** en céntimos (`priceAmount`, `offerPriceAmount`). La moneda viene en `currency`.

## 1. Dónde va en la app

Un **ícono de tienda al lado de la campana** de notificaciones abre la pantalla Tienda. Para una barbería (pantalla del local), la misma Tienda se pide con `audience=BARBERSHOPS`: en ese caso muestra máquinas, insumos, mobiliario y cursos.

## 2. Pantalla Tienda

`GET /store?audience=CLIENTS|BARBERSHOPS&category=…` (pública; por defecto `CLIENTS`).

| Campo        | Qué mostrar                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `featured`   | Carrusel de destacados (como los anuncios: registra impresiones y clics con `/placements/{id}/events`)                                                       |
| `categories` | Chips de rubro para filtrar (`category`): solo los que tienen marcas                                                                                         |
| `offers`     | «Ofertas»: mayor descuento primero. Precio de oferta grande, precio normal tachado, insignia `-{discountPercent} %`, cupón si existe y «hasta {offerEndsAt}» |
| `products`   | «Productos»: sin oferta, los más nuevos                                                                                                                      |
| `brands`     | «Marcas»: logo, portada, rubro y `hasOffers`. Tocar abre la ficha de la marca                                                                                |
| `videos`     | Videos cortos de marcas (hasta 30 s): **empiezan sin sonido**; tocar activa el sonido                                                                        |
| `deals`      | «Descuentos en reservas»: de Charles (`fromCharles`, valen en todas) o de una barbería (`barbershopId`, abrir la barbería)                                   |

Rubros (`category`): `COSMETICS` (cosmética y cuidado), `TOOLS` (máquinas y herramientas), `FURNITURE` (mobiliario), `SUPPLIES` (insumos), `EDUCATION` (formación) y `OTHER`.

## 3. Ficha de la marca

`GET /sponsors/{id}` (pública): `name`, `logoUrl`, `coverUrl`, `category`, `description`, `websiteUrl`, `products` (los mismos campos que en la Tienda) y `videos`.

Si una oferta venció, el servidor ya la quita: `offerPriceAmount`, `discountPercent`, `couponCode` y `offerEndsAt` llegan en `null`, y el producto se muestra con su precio normal.

## 4. «Ver en la tienda»

Antes de abrir `actionUrl`, registra el clic:

`POST /store/products/{id}/click` con `{ viewerKey? }` → **204**.

- **Con sesión:** cuerpo vacío.
- **Sin sesión:** `viewerKey` es el mismo UUID de instalación que usas para los anuncios.
- Se cuenta un clic por persona y hora; los repetidos se ignoran. No se guarda la IP.

## 5. Espacios de anuncios

Los anuncios de siempre siguen igual (`GET /placements?slot=…`). Hay un espacio nuevo, `store_featured`, que es el que llega como `featured` en `/store`.
