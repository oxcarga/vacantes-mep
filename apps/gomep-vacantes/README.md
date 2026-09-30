# gomep-vacantes

App Next.js en Firebase App Hosting: registro con correo y contraseña,
verificación, magic link, vacantes abiertas para docentes y un panel de admin.

## Local

```bash
cp apps/gomep-vacantes/.env.example apps/gomep-vacantes/.env.local
# completar NEXT_PUBLIC_FIREBASE_* desde la consola de Firebase
# ADMIN_EMAILS=admin@example.com
npm run dev
```

Con emuladores (`npm run emulators` desde la raíz del repo), también defina
`NEXT_PUBLIC_USE_EMULATORS=1`.

`ADMIN_EMAILS` es una lista separada por comas. Esos correos reciben el rol
`admin` al crear el perfil (`ensureUserProfile`).

App Hosting: conecte este repositorio y ponga el directorio raíz del backend en
`apps/gomep-vacantes`.
