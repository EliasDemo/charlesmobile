# ADR 0001 — Base técnica

- **Estado:** aceptada
- **Fecha:** 2026-10-06
- **Fase:** M1

## Contexto

La app de Charles se construye para Android e iOS con un solo código y debe integrar el SDK de pagos de Izipay (`@lyracom/react-native-sdk-payment-module`). Ese SDK es un TurboModule que exige la nueva arquitectura y React Native 0.77 o superior, y no funciona en Expo Go.

## Decisión

Expo con **compilación de desarrollo** (`expo-dev-client`), compilada en la nube con **EAS Build** dentro de la organización `charlesapp-pe`. Todas las versiones van fijadas exactas en `package.json`; `npx expo-doctor` pasa los 21 controles.

### Versiones elegidas

| Paquete | Versión |
|---|---|
| Node / pnpm | 24.14 / 10.34.6 |
| Expo SDK | 57.0.27 |
| React Native | 0.86.3 (nueva arquitectura activada, por defecto) |
| React | 19.2.3 |
| TypeScript | 6.0.3 (`strict`, `noUncheckedIndexedAccess`) |
| expo-router | 57.0.25 |
| @tanstack/react-query | 5.104.1 |
| zustand | 5.0.15 |
| openapi-fetch / openapi-typescript | 0.17.0 / 7.13.0 |
| react-hook-form / @hookform/resolvers / zod | 7.89.0 / 5.9.1 / 4.6.5 |
| i18next / react-i18next | 26.4.2 / 17.0.16 |
| expo-secure-store | 57.0.4 |
| expo-location / react-native-maps | 57.0.20 / 1.27.2 |
| expo-notifications / expo-device | 57.0.22 / 57.0.2 |
| @lyracom/react-native-sdk-payment-module | 4.0.1 |
| @react-native-community/netinfo | 12.0.1 |
| expo-build-properties | 57.0.22 |
| Jest / jest-expo / Testing Library | 29.7.0 / 57.0.5 / 14.0.1 |
| ESLint / eslint-config-expo / Prettier | 9.39.5 / 57.0.2 / 3.9.9 |

### Por qué algunas versiones no son la última

- **Jest 29** y no 30: es la versión que exige el SDK 57 de Expo (`expo-doctor`).
- **ESLint 9** y no 10: `eslint-plugin-react`, incluido en `eslint-config-expo`, todavía no funciona con ESLint 10.

### Otras decisiones

- **Módulos nativos instalados desde M1** (mapas, ubicación, notificaciones, almacenamiento seguro, Izipay), aunque sus pantallas lleguen después, para no tener que recompilar en cada fase.
- **Variantes por `APP_VARIANT`** (`development`, `preview`, `production`) en `app.config.ts`:
  - La variante de desarrollo usa el identificador `pe.charlesapp.mobile.dev` y el nombre "Charles (dev)". Así convive con la versión publicada en el mismo teléfono.
  - El tráfico HTTP en claro solo se permite en desarrollo, en Android con `expo-build-properties` y en iOS con una excepción de ATS.
- **`EXPO_PUBLIC_API_URL` es el origen** (`http://IP:3000`), sin `/api/v1`, porque las rutas de `openapi.json` ya incluyen `/api/v1`. Si el valor no es válido, la app muestra una pantalla de configuración en vez de cerrarse.
- **Plugin propio `plugins/withLyraPaymentSDK.js`**, tomado del ejemplo oficial de Lyra para Expo: en iOS hace dinámicos los frameworks `LyraPaymentSDK`, `LyraMotion`, `LyraMaterial` y `SnapKit`.
- **Límites de arquitectura con `no-restricted-imports`** de ESLint, en lugar de `eslint-plugin-boundaries`: no añade dependencias y los mensajes quedan en español.
- **Tipos de la API en `src/shared/api/generated/schema.ts`**, generados por `openapi-typescript`. `pnpm check:api`, dentro de `pnpm verify`, los regenera en memoria desde `docs/api/openapi.json` y falla si difieren del archivo guardado.
- **Fuente Inter** con `@expo-google-fonts/inter`. Si no carga, la app usa la fuente del sistema.

## Consecuencias

- Cada vez que se añade o actualiza un módulo nativo, o se cambia `app.config.ts` o un plugin, hay que hacer una compilación nueva con EAS. Los cambios solo en JavaScript llegan con `pnpm start`.
- Actualizar el SDK de Expo exige revisar esta tabla y volver a ejecutar `npx expo-doctor`.
