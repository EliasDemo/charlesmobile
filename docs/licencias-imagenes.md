# Licencias de las imágenes

Fotos de stock con licencia libre que la app usa **solo como identidad de Charles**: bienvenida, fondo de inicio de sesión y registro, portadas genéricas por categoría y pantallas vacías. **Nunca** se presentan como la foto real de una barbería: las portadas genéricas llevan siempre la etiqueta visible "Imagen ilustrativa", y cuando una barbería tenga foto propia (Fase 14 del backend) se mostrará esa.

## Cómo agregar fotos

1. Copia el original a `assets/stock/` con uno de los nombres de la tabla de usos (por ejemplo `cover-haircut.jpg`).
2. Agrega su fila en la tabla de licencias de abajo, con la URL de origen, el autor y la licencia **exacta**. Sin fila, `pnpm images:optimize` la omite: ninguna imagen entra a la app sin origen documentado.
3. Ejecuta `pnpm images:optimize`. Genera `assets/images/<nombre>.webp` con el ancho adecuado y actualiza `src/shared/ui/brandImages.generated.ts`.

## Usos y nombres

| Nombre | Dónde se usa | Ancho |
|---|---|---|
| `welcome-find`, `welcome-book`, `welcome-manage` | Pantallas de bienvenida | 1080 px |
| `auth-background` | Fondo de inicio de sesión y registro (con velo oscuro del tema) | 1080 px |
| `cover-generic` | Portada genérica por defecto ("Imagen ilustrativa") | 720 px |
| `cover-<categoría>` (`cover-haircut`, `cover-beard`, `cover-haircut_beard`, `cover-kids_haircut`, `cover-hair_color`, `cover-hair_treatment`, `cover-shave`, `cover-eyebrows`, `cover-other`) | Portada genérica según la categoría con más servicios de la barbería | 720 px |
| `empty-bookings`, `empty-favorites`, `empty-search` | Pantallas vacías | 480 px |

Mientras falte una foto, la app muestra una ilustración hecha con iconos y los colores del tema.

## Licencias

| Nombre | Archivo original | URL de origen | Autor | Licencia | Fecha de descarga |
|---|---|---|---|---|---|
| cover-haircut | `cover-haircut.jpg` | Generada con IA | Google Gemini (plan gratuito), por el usuario | Contenido generado con Gemini según los Términos del Servicio de Google y la Política de Uso Prohibido de IA generativa; Google no reclama la propiedad del contenido generado. Lleva la marca invisible SynthID. | 2026-10-09 |
| cover-beard | `cover-beard.jpg` | Generada con IA | Google Gemini (plan gratuito), por el usuario | Contenido generado con Gemini según los Términos del Servicio de Google y la Política de Uso Prohibido de IA generativa; Google no reclama la propiedad del contenido generado. Lleva la marca invisible SynthID. | 2026-10-09 |
| cover-haircut_beard | `cover-haircut_beard.jpg` | Generada con IA | Google Gemini (plan gratuito), por el usuario | Contenido generado con Gemini según los Términos del Servicio de Google y la Política de Uso Prohibido de IA generativa; Google no reclama la propiedad del contenido generado. Lleva la marca invisible SynthID. | 2026-10-09 |
| cover-kids_haircut | `cover-kids_haircut.jpg` | Generada con IA | Google Gemini (plan gratuito), por el usuario | Contenido generado con Gemini según los Términos del Servicio de Google y la Política de Uso Prohibido de IA generativa; Google no reclama la propiedad del contenido generado. Lleva la marca invisible SynthID. | 2026-10-09 |
| welcome-find | `welcome-find.jpg` | Generada con IA | Google Gemini (plan gratuito), por el usuario | Contenido generado con Gemini según los Términos del Servicio de Google y la Política de Uso Prohibido de IA generativa; Google no reclama la propiedad del contenido generado. Lleva la marca invisible SynthID. | 2026-10-09 |
| welcome-book | `welcome-book.jpg` | Generada con IA | Google Gemini (plan gratuito), por el usuario | Contenido generado con Gemini según los Términos del Servicio de Google y la Política de Uso Prohibido de IA generativa; Google no reclama la propiedad del contenido generado. Lleva la marca invisible SynthID. | 2026-10-09 |
| welcome-manage | `welcome-manage.jpg` | Generada con IA | Google Gemini (plan gratuito), por el usuario | Contenido generado con Gemini según los Términos del Servicio de Google y la Política de Uso Prohibido de IA generativa; Google no reclama la propiedad del contenido generado. Lleva la marca invisible SynthID. | 2026-10-09 |
| auth-background | `auth-background.jpg` | Generada con IA | Google Gemini (plan gratuito), por el usuario | Contenido generado con Gemini según los Términos del Servicio de Google y la Política de Uso Prohibido de IA generativa; Google no reclama la propiedad del contenido generado. Lleva la marca invisible SynthID. | 2026-10-09 |
