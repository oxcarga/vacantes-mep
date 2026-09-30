# Vacantes MEP (gomep)

Consulta el formulario de vacantes de profesores del MEP
(<https://apps.mep.go.cr/formulario>) y guarda el resultado en Firestore.

Este repositorio tiene dos apps y un esquema compartido:

| Paquete | Qué es | Dónde corre |
|---|---|---|
| [`gomep-vacantes-scrapper`](apps/gomep-vacantes-scrapper) | Scraper con Chromium | Cloud Run Job, cada hora |
| [`gomep-vacantes`](apps/gomep-vacantes) | Next.js (Auth + placeholder) | Firebase App Hosting |
| [`@gomep/schema`](packages/schema) | Nombres de colecciones Firestore | ambos |

```
Cloud Scheduler  →  Cloud Run Job (scraper)  →  Firestore
                                              ↗
Browser  →  App Hosting (gomep-vacantes)  →  Firebase Auth
```

Más adelante `gomep-vacantes` será la app de usuarios: suscripción a una
**regional** y una **especialidad**. El campo `especialidad` ya está
desnormalizado en cada documento de `vacantes` para no migrar otra vez.

## Cómo funciona el scraper

1. **Consulta** — Chromium abre el formulario y recorre **todas las regionales**
   del dropdown. El sitio es una
   app Blazor Server: sin navegador la tabla no existe.
2. **Pagina** — recorre el paginador de cada regional y junta todas las páginas.
   Cada fila guarda la URL del botón **Aplicar** en `fields.Aplicar`.
3. **Filtra** — opcional; por omisión se queda con todas las filas.
4. **Compara** — contrasta el resultado contra Firestore (o un JSON local) y
   guarda altas, bajas y modificaciones.

## Empezar (local)

```bash
npm install
cp apps/gomep-vacantes-scrapper/.env.example apps/gomep-vacantes-scrapper/.env

npx playwright install chromium
npm run monitor
```

Sin Firestore el estado se guarda en `apps/gomep-vacantes-scrapper/data/baseline.json`.

Con el emulador:

```bash
npm run emulators   # Auth :9099, Firestore :8080, UI :4000
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIRESTORE_PROJECT_ID=demo-gomep-vacantes npm run monitor
npm run test:firestore
```

La app web:

```bash
cp apps/gomep-vacantes/.env.example apps/gomep-vacantes/.env.local
# NEXT_PUBLIC_FIREBASE_* desde la consola de Firebase
npm run dev
```

## Firestore

Colecciones (definidas en [`packages/schema`](packages/schema)):

**`vacantes/{id}`** — `id` es el número de Vacante del MEP. (El código vigente aún usa la colección `openings` hasta aplicar el cambio OpenSpec *accounts-subscriptions-and-alerts*.)

| Campo | Tipo | Notas |
|---|---|---|
| `regional` | string | |
| `especialidad` | string | copia de `fields.Especialidad`, para consultas futuras |
| `summary` | string | |
| `fields` | map | celdas del scrape, más `Aplicar` (URL del botón) |
| `firstSeen` / `lastSeen` | string ISO-8601 | `firstSeen` no se pisa al reaparecer |
| `active` | boolean | `false` cuando deja de publicarse |

**`corridas_scrape/{autoId}`** — una fila por consulta, exitosa o fallida (hoy `scrape_runs` en código):
`startedAt`, `finishedAt`, `ok`, `regional`, `rowCount`, `contentHash`,
`error`, `newCount`, `goneCount`, `changedCount`.

Reglas: el Admin SDK del Job escribe; un usuario autenticado puede leer.
Despliegue: `firebase deploy --only firestore`.

### Importar un baseline JSON (opcional)

Si tiene `data/baseline.json` o un volcado de vacantes:

```bash
FIRESTORE_PROJECT_ID=su-proyecto npm run import:firestore -w gomep-vacantes-scrapper -- ruta/al/baseline.json
```

Para el SQLite que quedó en el volumen de Fly, exporte a JSON primero
(`SELECT fields FROM vacantes` o el nombre legacy `openings`) y pase ese archivo. No hay runtime de Fly
en este repo.

## Desplegar el scraper (Cloud Run Job)

1. Cree un proyecto GCP/Firebase, active facturación, Firestore (modo nativo)
   en `us-central1`, Artifact Registry, Cloud Run y Cloud Scheduler.
2. Cuenta de servicio `gomep-vacantes-scrapper` con `roles/datastore.user`.
3. Build y Job:

```bash
gcloud builds submit --config apps/gomep-vacantes-scrapper/cloudbuild.yaml

# Edite PROJECT en apps/gomep-vacantes-scrapper/job.yaml
gcloud run jobs replace apps/gomep-vacantes-scrapper/job.yaml --region=us-central1
```

4. Scheduler cada hora, invocando `:run` del Job con OIDC:

```bash
gcloud scheduler jobs create http gomep-vacantes-scrapper-hourly \
  --location us-central1 \
  --schedule "0 * * * *" \
  --uri "https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT/jobs/gomep-vacantes-scrapper:run" \
  --http-method POST \
  --oauth-service-account-email gomep-vacantes-scrapper@PROJECT.iam.gserviceaccount.com
```

5. Prueba: `gcloud run jobs execute gomep-vacantes-scrapper --region=us-central1`

Cuando el Job haya escrito en Firestore, apague Fly:

```bash
fly apps destroy vacantes-mep
```

## Desplegar gomep-vacantes (App Hosting)

En Firebase Console → App Hosting, conecte este repo y ponga el directorio
raíz del backend en `apps/gomep-vacantes`. Active el proveedor Google en
Authentication. Las variables `NEXT_PUBLIC_FIREBASE_*` van en el backend de
App Hosting.

Esta versión sólo muestra inicio de sesión. No hay tabla de vacantes todavía.

## Qué hace con el resultado

- **Primera consulta** — guarda la lista filtrada completa.
- **Sin cambios** — vuelve a guardar el mismo estado.
- **Con cambios** — guarda altas, bajas y modificaciones en el estado.
- **Tabla vacía** — si la tabla llega sin filas pero antes había vacantes,
  **no** reemplaza el estado. Si el formulario sí puede quedarse sin vacantes,
  `ALLOW_EMPTY_TABLE=1`.
- **Error** — registra el fallo después de `SCRAPE_ATTEMPTS` reintentos y no
  pisa el estado anterior.

Una vacante se identifica por `TABLE_IDENTITY_CELL_NAMES`
(`Vacante`, `Especialidad`, `Institución`). Si cambia cualquier otra columna
se reporta como *modificada*.

## Variables de entorno (scraper)

Todas son opcionales.

| Variable | Por omisión | Descripción |
|---|---|---|
| `TARGET_URL` | `https://apps.mep.go.cr/formulario` | Página a consultar |
| `CONTENT_SELECTOR` | `.mud-table-container` | Selector de la tabla |
| `USE_PLAYWRIGHT` | `1` | Usar Chromium |
| `HEADLESS` | `1` | `0` muestra el navegador |
| `PLAYWRIGHT_LAUNCH_ARGS` | — | Argumentos de Chromium, separados por coma |
| `DROPDOWN_SELECTOR` | `#regionalSelect` | Combo de regional |
| `DROPDOWN_WAIT_AFTER_MS` | `2000` | Espera tras escoger cada regional |
| `MAX_PAGES` | `30` | Máximo de páginas del paginador |
| `SCRAPE_ATTEMPTS` | `3` | Intentos antes de fallar |
| `TABLE_CELL_NAMES` | `Vacante,Especialidad,Clase de Puesto,Institución,Lecciones` | Columnas |
| `TABLE_IDENTITY_CELL_NAMES` | `Vacante,Especialidad,Institución` | Identidad de una vacante |
| `TABLE_FILTER_*_VALUE` | — | Filtros; vacío = sin filtro |
| `ALLOW_EMPTY_TABLE` | `0` | Aceptar tabla vacía |
| `BASELINE_PATH` | `data/baseline.json` | JSON local si no hay Firestore |
| `FIRESTORE_PROJECT_ID` | `GOOGLE_CLOUD_PROJECT` | Proyecto Firestore |
| `FIRESTORE_EMULATOR_HOST` | — | p.ej. `127.0.0.1:8080` |

Los filtros van en pares: `TABLE_FILTER_ESPECIALIDAD` dice **qué columna** y
`TABLE_FILTER_ESPECIALIDAD_VALUE` **qué valores**. Para dos especialidades:
`TABLE_FILTER_ESPECIALIDAD_VALUE="Español,Inglés"`.

## Desarrollo

```bash
npm test              # unitarias + e2e JSON, sin emulador
npm run test:firestore  # lo anterior más el store Firestore (Java + emulador)
HEADLESS=0 npm run monitor
```

| Módulo | Responsabilidad |
|---|---|
| `apps/gomep-vacantes-scrapper/src/main.js` | Orquesta scrape, comparación y persistencia |
| `apps/gomep-vacantes-scrapper/src/store/` | JSON local o Firestore, misma interfaz |
| `packages/schema` | Colecciones y formas de documento |
| `apps/gomep-vacantes` | Next.js + Firebase Auth |
