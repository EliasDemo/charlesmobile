# Flujos completos con Maestro

Se ejecutan contra el backend local y la compilación de desarrollo instalada en un teléfono o emulador conectado por USB (`adb devices` debe listarlo).

1. Instala Maestro: <https://docs.maestro.dev/getting-started/installing-maestro> (en Windows necesita Java 17 o superior).
2. Levanta el backend (`docs/api/GUIA-API.md`) y la app con `pnpm start`.
3. Ejecuta:

```
maestro test e2e/auth-register.yaml
maestro test -e SEED_PASSWORD=<valor de SEED_USER_PASSWORD> e2e/auth-login-logout.yaml
maestro test e2e/search-detail.yaml
maestro test -e SEED_PASSWORD=<valor de SEED_USER_PASSWORD> e2e/book-cancel.yaml
```

## Código de verificación en desarrollo

El backend no envía correos: los guarda en Redis. Para leer el código de verificación o de recuperación de un correo, desde la carpeta del backend (`..\charles`):

```
pnpm --filter api dev:mail <correo>
```
