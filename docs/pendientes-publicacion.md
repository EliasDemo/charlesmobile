# Pendientes antes de publicar

Lista de cosas que hay que resolver antes de subir la app a las tiendas (fase M11 o antes).

| # | Pendiente | Por qué | Origen |
|---|---|---|---|
| 1 | **Confirmar el identificador `pe.charlesapp.mobile`** (Android `applicationId` e iOS `bundleIdentifier`) | Después de publicar no se puede cambiar. Conviene que coincida con un dominio de la marca. | M1 |
| 2 | **Marca definitiva:** colores, logo, icono y pantalla de inicio | Hoy se usan una paleta provisional (neutro oscuro con acento cobre) y los iconos de la plantilla de Expo. Los colores se cambian solo en `src/shared/theme/tokens.ts`. | M1 |
| 3 | **Clave de Google Maps para Android** (variable de EAS `GOOGLE_MAPS_ANDROID_API_KEY`, restringida al paquete y la firma) | La de desarrollo se crea en M3 para `pe.charlesapp.mobile.dev`. Antes de publicar, agregar a la restricción el paquete `pe.charlesapp.mobile` con la huella SHA-1 de producción (y la de Google Play App Signing), y poner `EXPO_PUBLIC_MAPS_ANDROID_ENABLED=true` en el entorno `production` de EAS. | M1 / M3 |
| 4 | **Fijación de certificado** | Lo exige CLAUDE.md §5. | M11 |
| 5 | **Revisar el texto del permiso de cámara** (`NSCameraUsageDescription`) | Lo pide el SDK de Izipay para escanear tarjetas; hay que confirmar en M5 que se usa. | M1 |
| 6 | **Servicio de reporte de fallos y analítica** | Se decidió no instalar ninguno hasta M11. | M1 |
| 7 | **Versión mínima de la app** | La app ya envía `X-App-Version` y `X-App-Platform`; falta que el backend responda con algo como `APP_UPDATE_REQUIRED` (AJUSTES-BACKEND #7) y que la app lo maneje. | M1 |
| 8 | **Políticas de las tiendas:** privacidad, uso de la ubicación y eliminación de la cuenta | Requisito de Google Play y de App Store. | M11 |
| 9 | ~~**Enlaces de términos y política de privacidad**~~ | **Resuelto:** llegan en `GET /auth/terms` (`termsUrl`, `privacyUrl`) y se muestran solo si vienen. Falta que el backend configure las URL reales (`legal.terms_url`, `legal.privacy_url`). | M2 / M6 previo |
| 10 | ~~**Eliminación de la cuenta desde la app**~~ | **Resuelto:** Perfil → "Eliminar mi cuenta" (vista previa, contraseña, 30 días) y cancelación con acceso limitado al iniciar sesión (`docs/api/CUENTA.md`). | M2 / M6 previo |
