# gomep-vacantes

App Next.js en Firebase App Hosting. Por ahora: cableado de Firebase Auth y un
placeholder (inicio con Google). El listado de vacantes, el panel de admin y las
suscripciones (regional + especialidad) llegan con el cambio
*accounts-subscriptions-and-alerts*.

## Local

```bash
cp apps/gomep-vacantes/.env.example apps/gomep-vacantes/.env.local
# completar NEXT_PUBLIC_FIREBASE_* desde la consola de Firebase
npm run dev
```

Con emuladores (`npm run emulators` desde la raíz del repo), también defina
`NEXT_PUBLIC_USE_EMULATORS=1`.

App Hosting: conecte este repositorio y ponga el directorio raíz del backend en
`apps/gomep-vacantes`.
