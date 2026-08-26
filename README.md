# Vacantes MEP

Consulta cada hora las [vacantes de profesores del MEP](https://apps.mep.go.cr/formulario) para **Español** en la **Regional Educación Pérez Zeledón** y avisa solo cuando la lista cambia (ntfy.sh y/o Telegram).

Hourly GitHub Action that scrapes MEP teaching vacancies and notifies on new or closed openings.

## Cómo funciona

1. **Scraping** — Playwright abre el formulario del MEP, elige la regional (dropdown MudBlazor) y espera la tabla.
2. **Filtro** — Se quedan las filas cuya especialidad es `Español` (configurable).
3. **Comparación** — Se compara con `data/baseline.json` de la corrida anterior.
4. **Aviso** — ntfy.sh y/o Telegram solo si hay vacantes nuevas, si alguna desapareció, o en la primera corrida.
5. **Persistencia** — En Actions el baseline se guarda en cache entre corridas. Si el cache se pierde, se trata como primera corrida (un aviso con el listado actual), no como “todo es nuevo”.

## Inicio rápido (local)

```bash
cp .env.example .env
# Edita .env: NTFY_TOPIC y/o TELEGRAM_*

npm install
npx playwright install chromium
npm test
npm run monitor
```

Cron local cada hora:

```bash
0 * * * * cd /path/to/vacantes-mep && npm run monitor
```

## GitHub Actions

1. Configura secrets y (opcionalmente) variables del repositorio.
2. Secretos: `NTFY_TOPIC` y/o `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`.
3. El workflow corre cada hora y también se puede lanzar a mano (Actions → Vacantes de Profesores - MEP → Run workflow).

Los valores vacíos de las variables caen en los defaults de Pérez Zeledón / Español. `DROPDOWN_CUSTOM` queda en `1` si la variable del repo está vacía; si el control es un `<select>` nativo (como el formulario actual del MEP), el script usa `selectOption` de todos modos.

Si la regional configurada no aparece en el dropdown (hoy Pérez Zeledón a veces no está en la lista), el job falla y el aviso incluye las opciones disponibles.

### Cron en repos públicos

GitHub **desactiva** los workflows programados en repositorios públicos después de **60 días sin commits**. Las corridas del cron no cuentan como actividad. Un push vuelve a activarlos. Si las notificaciones paran de golpe, revisa Actions y vuelve a habilitar el workflow.

### Telegram

1. Habla con [@BotFather](https://t.me/BotFather), crea un bot y copia el token.
2. Envíale un mensaje al bot.
3. Abre `https://api.telegram.org/bot<TOKEN>/getUpdates` — tu `chat.id` está en la respuesta.

### ntfy.sh

1. Elige un nombre de tema **único y difícil de adivinar**.
2. Guárdalo como secret `NTFY_TOPIC`.
3. Suscríbete en `https://ntfy.sh/<tema>` o con la app ntfy.

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| TARGET_URL | `https://apps.mep.go.cr/formulario` | URL del formulario |
| CONTENT_SELECTOR | `.mud-table-container` | Selector de la tabla |
| USE_PLAYWRIGHT | `1` | Browser real (necesario para el MEP) |
| DROPDOWN_SELECTOR | `#regionalSelect` | Selector del dropdown de regional |
| DROPDOWN_OPTION_VALUE | `53` | Value de Pérez Zeledón |
| DROPDOWN_OPTION_LABEL | `Regional Educación Perez Zeledon` | Texto visible de la opción |
| DROPDOWN_CUSTOM | `1` | `1` para dropdowns MudBlazor (click + opción) |
| DROPDOWN_OPTION_SELECTOR | `.mud-list-item, [role='option'], .mud-select-item` | Opciones del dropdown custom |
| DROPDOWN_WAIT_AFTER_MS | `2000` | Espera extra después de elegir la regional |
| HEADLESS | `1` | `0` para ver el navegador |
| TABLE_FILTER_ESPECIALIDAD | `Especialidad` | `data-label` de la celda a filtrar |
| TABLE_FILTER_ESPECIALIDAD_VALUE | `Español` | Valor que debe tener esa celda |
| TABLE_CELL_NAMES | `Vacante,Especialidad,Clase de Puesto,Institución,Lecciones` | Columnas que identifican una vacante |
| NTFY_TOPIC | — | Tema de ntfy.sh |
| TELEGRAM_BOT_TOKEN | — | Token del bot |
| TELEGRAM_CHAT_ID | — | Chat ID |
| BASELINE_PATH | `data/baseline.json` | Snapshot de la última corrida |

Un fallo de scraping envía un aviso de error y deja el job de Actions en rojo.
