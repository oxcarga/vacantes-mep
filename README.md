# Vacantes MEP

Vigila el formulario de vacantes de profesores del MEP
(<https://apps.mep.go.cr/formulario>) y avisa por ntfy.sh o Telegram **sólo
cuando la lista cambia**: cuando aparece una vacante nueva, cuando una deja de
publicarse o cuando cambian sus detalles.

## Cómo funciona

1. **Consulta** — Chromium abre el formulario, escoge la regional y espera a que
   la tabla cargue. El sitio es una app Blazor Server: sin navegador la tabla no
   existe (ver [el spike](#el-mep-necesita-chromium)).
2. **Pagina** — recorre el paginador y junta todas las páginas de la tabla, no
   sólo la primera.
3. **Filtra** — se queda con las filas cuya especialidad (u otra columna) tiene
   el valor configurado.
4. **Compara** — contrasta el resultado contra el estado de la consulta anterior.
5. **Avisa** — envía una sola notificación con las altas, bajas y modificaciones.
   Si no cambió nada, no manda nada.

## Empezar

```bash
cp .env.example .env
# Edite .env: al menos NTFY_TOPIC (o TELEGRAM_*) y la regional que le interesa.

npm install
npx playwright install chromium
npm run monitor
```

La primera consulta manda la lista completa para que confirme que los filtros
están bien. A partir de ahí sólo avisa cuando algo cambia.

## Dónde ejecutarlo

### GitHub Actions (lo más simple)

El workflow `.github/workflows/monitor.yml` corre cada hora.

1. Haga fork del repo.
2. En **Settings → Secrets and variables → Actions** agregue:
   - **Variables**: `TARGET_URL`, `DROPDOWN_OPTION_VALUE` o
     `DROPDOWN_OPTION_LABEL`, `TABLE_FILTER_ESPECIALIDAD_VALUE`, y cualquier otra
     de la [tabla de variables](#variables-de-entorno).
   - **Secrets**: `NTFY_TOPIC` y/o `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`.
     Opcionalmente `DATABASE_URL` y `DATABASE_AUTH_TOKEN`.
3. Haga push. También puede lanzarlo a mano desde **Actions → Run workflow**.

Sin `DATABASE_URL` el estado viaja en la caché de Actions, que GitHub borra a
los 7 días sin uso; si eso pasa la siguiente consulta se comporta como una
primera consulta y vuelve a mandar la lista completa. Para un histórico
permanente configure Turso (ver abajo). Además, GitHub apaga los cron de los
repos públicos tras 60 días sin commits.

### Docker en un VPS

```bash
cp .env.example .env      # configure su regional y su canal de notificación
docker compose up -d      # supercronic consulta cada hora dentro del contenedor
docker compose logs -f scraper

docker compose --profile once run --rm scraper-once   # una consulta suelta
```

La base SQLite queda en el volumen `vacantes-data`, así que el histórico
sobrevive a los reinicios y a las reconstrucciones de la imagen.

### Fly.io

`fly.toml` define una máquina programada con Chromium y un volumen para la base.
Las instrucciones están en los comentarios del archivo.

### Cron local

```bash
0 * * * * cd /ruta/a/vacantes-mep && npm run monitor
```

## Estado entre consultas

Para saber qué cambió hay que recordar lo que se vio antes. Hay dos opciones:

| | Archivo JSON (por defecto) | SQLite / Turso (`DATABASE_URL`) |
|---|---|---|
| Configuración | ninguna | `DATABASE_URL` (y `DATABASE_AUTH_TOKEN` en Turso) |
| Guarda | la última lista vista | además, alta y baja de cada vacante y el registro de cada consulta |
| Sirve para | GitHub Actions, pruebas locales | VPS, Fly, o Actions con Turso |

Con `DATABASE_URL` se crean dos tablas:

- **`openings`** — una fila por vacante con `first_seen`, `last_seen` y `active`,
  de modo que puede consultar cuánto duró publicada cada vacante. La fila
  completa se guarda como JSON en `fields`, así que las columnas se pueden
  consultar aunque cambien: `SELECT json_extract(fields, '$.Institución') FROM
  openings WHERE active = 1`.
- **`scrape_runs`** — una fila por consulta, exitosa o fallida, con cuántas
  vacantes había y cuántas cambiaron. Útil para notar que el scraper lleva días
  fallando en silencio.

Ambos formatos son intercambiables: el mismo código decide qué notificar, la
base sólo agrega el histórico.

## Cuándo avisa y cuándo no

- **Primera consulta** — manda la lista completa filtrada.
- **Sin cambios** — no manda nada.
- **Con cambios** — un solo mensaje con tres secciones: nuevas, ya no aparecen y
  modificadas.
- **Tabla vacía** — si la tabla llega sin filas pero antes había vacantes, avisa
  del problema y **no** reemplaza el estado guardado. Casi siempre es una
  consulta rota, no que se hayan cerrado todas las vacantes a la vez; guardarla
  haría que la siguiente consulta reportara todo como nuevo. Si su regional sí
  puede quedarse sin vacantes, ponga `ALLOW_EMPTY_TABLE=1`.
- **Error** — manda el mensaje de error. Si falla la opción de la regional, la
  notificación incluye la lista de regionales que el formulario sí ofrecía.

Una vacante se identifica por las columnas de `TABLE_IDENTITY_CELL_NAMES`
(`Vacante`, `Especialidad`, `Institución`). Si cambia cualquier otra columna
—las lecciones, por ejemplo— se reporta como *modificada* en vez de como una
baja seguida de un alta.

## Variables de entorno

Todas son opcionales salvo el canal de notificación; los valores por omisión
apuntan al formulario del MEP.

| Variable | Por omisión | Descripción |
|---|---|---|
| `TARGET_URL` | `https://apps.mep.go.cr/formulario` | Página a consultar |
| `CONTENT_SELECTOR` | `.mud-table-container` | Selector de la tabla |
| `USE_PLAYWRIGHT` | `1` | Usar Chromium. `0` hace una petición HTTP simple |
| `HEADLESS` | `1` | `0` muestra el navegador (para depurar) |
| `PLAYWRIGHT_LAUNCH_ARGS` | — | Argumentos de Chromium separados por coma |
| `DROPDOWN_SELECTOR` | `#regionalSelect` | Selector del combo de regional |
| `DROPDOWN_OPTION_VALUE` | `53` | Value de la regional |
| `DROPDOWN_OPTION_LABEL` | `Regional Educación Perez Zeledon` | Nombre de la regional |
| `DROPDOWN_CUSTOM` | `1` | Sólo aplica si el combo no es un `<select>` |
| `DROPDOWN_OPTION_SELECTOR` | `.mud-list-item, [role='option'], …` | Opciones de un combo no nativo |
| `DROPDOWN_WAIT_AFTER_MS` | `2000` | Espera tras escoger la regional |
| `MAX_PAGES` | `30` | Máximo de páginas del paginador a recorrer |
| `TABLE_CELL_NAMES` | `Vacante,Especialidad,Clase de Puesto,Institución,Lecciones` | Columnas (`data-label`) que se leen |
| `TABLE_IDENTITY_CELL_NAMES` | `Vacante,Especialidad,Institución` | Columnas que identifican una vacante |
| `TABLE_FILTER_ESPECIALIDAD` | `Especialidad` | Columna a filtrar |
| `TABLE_FILTER_ESPECIALIDAD_VALUE` | — | Valor(es) aceptados, separados por coma |
| `TABLE_FILTER_PUESTO[_VALUE]` | `Clase de Puesto` | Segundo filtro |
| `TABLE_FILTER_INSTITUCION[_VALUE]` | `Institución` | Tercer filtro |
| `TABLE_FILTER_LECCIONES[_VALUE]` | `Lecciones` | Cuarto filtro |
| `ALLOW_EMPTY_TABLE` | `0` | Aceptar una tabla vacía como resultado válido |
| `BASELINE_PATH` | `data/baseline.json` | Archivo de estado |
| `DATABASE_URL` | — | `file:data/vacantes.db` o `libsql://…turso.io` |
| `DATABASE_AUTH_TOKEN` | — | Token de Turso |
| `NTFY_TOPIC` | — | Tema de ntfy.sh |
| `TELEGRAM_BOT_TOKEN` | — | Token del bot |
| `TELEGRAM_CHAT_ID` | — | Chat destino |

Los filtros van en pares: `TABLE_FILTER_ESPECIALIDAD` dice **qué columna** mirar
y `TABLE_FILTER_ESPECIALIDAD_VALUE` **qué valores** aceptar. Un `*_VALUE` vacío
desactiva ese filtro. Para vigilar dos especialidades:
`TABLE_FILTER_ESPECIALIDAD_VALUE="Español,Inglés"`.

## Notificaciones

**ntfy.sh** no necesita registro: escoja un tema único y difícil de adivinar
(cualquiera que sepa el nombre puede leer sus mensajes), póngalo en `NTFY_TOPIC`
y suscríbase en <https://ntfy.sh/su-tema> o desde la app.

**Telegram**: escríbale a [@BotFather](https://t.me/BotFather) para crear el bot
y copiar el token, mándele un mensaje a su bot y busque su `chat.id` en
`https://api.telegram.org/bot<TOKEN>/getUpdates`.

Los mensajes se recortan al límite de cada servicio (4 KB en ntfy, 4096
caracteres en Telegram) sin partir una tilde por la mitad. Si configura ambos
canales, que falle uno no impide que llegue el otro.

## Otras regionales

`DROPDOWN_OPTION_VALUE=53` es Pérez Zeledón. Si no sabe el value de la suya,
ponga sólo `DROPDOWN_OPTION_LABEL` con el nombre (o parte del nombre) y ejecute
`npm run monitor`: si no lo encuentra, el error lista todas las regionales que
ofrece el formulario, con su value.

## Desarrollo

```bash
npm test          # unitarias + end to end, sin red ni Chromium
HEADLESS=0 npm run monitor   # ver el navegador mientras consulta
```

Los módulos separan la lógica pura de los efectos, así que casi todo se prueba
sin navegador:

| Archivo | Responsabilidad |
|---|---|
| `src/config.js` | Lee y valida las variables de entorno |
| `src/scrape.js` | Chromium: regional, paginador, diagnóstico del combo |
| `src/vacancies.js` | Parseo, filtros, comparación y redacción del mensaje |
| `src/store.js` | Estado: archivo JSON o SQLite/Turso, misma interfaz |
| `src/notify.js` | Envío a ntfy y Telegram |
| `src/monitor.js` | Orquesta los anteriores |

`test/monitor.e2e.test.js` levanta un servidor con fixtures y ejecuta el
monitor de verdad contra los dos tipos de estado.

## El MEP necesita Chromium

`npm run spike:mep` revisa si el formulario expone alguna API JSON que
permitiera quitar Chromium (y con él la mayor parte del costo de ejecución). El
resultado está en [`scripts/mep-api-spike-findings.json`](scripts/mep-api-spike-findings.json):
la página es una SPA de Blazor Server + MudBlazor, la tabla no viene en el HTML
estático y no hay API pública, así que **Chromium sigue siendo necesario**. Vale
la pena repetir el spike si el sitio cambia.
