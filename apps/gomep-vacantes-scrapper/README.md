# gomep-vacantes-scrapper

Consulta el formulario de vacantes del MEP y guarda el resultado en Firestore
(o en un JSON local).

En producción corre como **Cloud Run Job**, disparado cada hora por Cloud
Scheduler. No hay disco persistente: el estado vive en Firestore.

## Local

```bash
cp apps/gomep-vacantes-scrapper/.env.example apps/gomep-vacantes-scrapper/.env
npm run monitor
```

Sin `FIRESTORE_PROJECT_ID` ni emulador, el estado se guarda en
`data/baseline.json`. Con el emulador:

```bash
npm run emulators          # en otra terminal, desde la raíz
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIRESTORE_PROJECT_ID=demo-gomep-vacantes npm run monitor
```

## Cloud Run

Construya la imagen desde la **raíz del repo** (la imagen necesita `@gomep/schema`):

```bash
gcloud builds submit --config apps/gomep-vacantes-scrapper/cloudbuild.yaml
```

Luego cree el job (edite `PROJECT` en `job.yaml`) y un Scheduler horario.
La cuenta de servicio del job necesita `roles/datastore.user`.

Vea el README raíz para el corte completo, importación opcional desde un JSON
baseline y destruir la app antigua en Fly.
