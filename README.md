# Vacantes MEP

Monitor the [MEP vacancy form](https://apps.mep.go.cr/formulario) and get a phone notification when postings appear or disappear. Notifications go to [ntfy.sh](https://ntfy.sh) and/or Telegram.

The hourly GitHub Action scrapes a regional (MudBlazor dropdown), filters the table (for example Español in Pérez Zeledón), compares against the last run, and notifies **only when the vacancy set changes**.

## Flow

1. **Fetch** — Open the MEP form with Playwright, select the regional, and collect every table page
2. **Parse** — Read table rows into vacancy objects
3. **Filter** — Keep rows matching especialidad (and optional puesto / institución / lecciones)
4. **Diff** — Compare with `data/baseline.json` from the previous run
5. **Notify** — Send ntfy.sh and/or Telegram only on first run or when vacancies are added/removed
6. **Persist** — Save the current list as the next baseline (GitHub Actions cache)

On the **first run** (no baseline yet) you get a short “monitoring started, N vacantes” message so the phone is confirmed working. Later runs stay silent if nothing changed.

## Quick Start (Local)

```bash
cp .env.example .env
# Edit .env: set NTFY_TOPIC and/or TELEGRAM_* , plus filters for your regional

npm install
npx playwright install chromium
npm test
npm run monitor
```

Run locally with `cron` for hourly checks:

```bash
# Edit crontab: crontab -e
0 * * * * cd /path/to/vacantes-mep && npm run monitor
```

## GitHub Actions (Cloud)

1. Fork or clone this repo
2. Add repository **variables** (Settings → Secrets and variables → Actions → Variables):
   - **TARGET_URL** — `https://apps.mep.go.cr/formulario`
   - **USE_PLAYWRIGHT** — `1`
   - **DROPDOWN_SELECTOR** — `#regionalSelect`
   - **DROPDOWN_OPTION_LABEL** — e.g. `Regional Educación Perez Zeledon`
   - **DROPDOWN_OPTION_VALUE** — regional id (optional if label is set)
   - **CONTENT_SELECTOR** — `.mud-table-container`
   - **TABLE_FILTER_ESPECIALIDAD_VALUE** — e.g. `Español` or `Español,Inglés`
   - Optional: `TABLE_FILTER_PUESTO_VALUE`, `TABLE_FILTER_INSTITUCION_VALUE`, `TABLE_FILTER_LECCIONES_VALUE`
3. Add repository **secrets**:
   - **NTFY_TOPIC** (optional) — ntfy.sh topic for push notifications
   - **TELEGRAM_BOT_TOKEN** / **TELEGRAM_CHAT_ID** (optional)
4. Push to GitHub. The workflow runs every 60 minutes (or use **Actions → Vacantes de Profesores - MEP → Run workflow**).

The vacancy baseline is restored/saved with Actions cache so change detection works across hourly runs. `#regionalSelect` is a native `<select>` on the MEP form; only set `DROPDOWN_CUSTOM=1` if you are targeting a custom listbox.

GitHub pauses scheduled workflows on public repos after ~60 days without a commit. Run the workflow manually or push a commit to start it again.

### Getting Telegram credentials

1. Message [@BotFather](https://t.me/BotFather), create a bot, copy the token
2. Send a message to your new bot
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` — your `chat.id` is in the response

### Getting ntfy.sh notifications

1. Pick a unique topic name (e.g. `vacantes-mep-perez`)
2. Add `NTFY_TOPIC=vacantes-mep-perez` to secrets (or `.env` locally)
3. Subscribe: open https://ntfy.sh/vacantes-mep-perez or use the ntfy app

## Pages that need a dropdown or JavaScript

The MEP form only shows vacancies after selecting a regional. Playwright runs a real browser, selects the native `<select id="regionalSelect">`, then captures the table. If that regional is not in the dropdown (no current postings), you get a Spanish error notification and the baseline is left unchanged.

1. Set `USE_PLAYWRIGHT=1` (or `true`) in your `.env`.
2. Set dropdown options:
   - **DROPDOWN_SELECTOR** — CSS selector for the dropdown (e.g. `#regionalSelect`).
   - **DROPDOWN_OPTION_VALUE** or **DROPDOWN_OPTION_LABEL** — which option to select (value or visible text).
   - **DROPDOWN_WAIT_AFTER_MS** — milliseconds to wait after selecting (default: `2000`). The script then waits for table rows.
3. **Custom dropdowns (MudBlazor, etc.):** If the dropdown is not a native `<select>` (e.g. MudBlazor, Material-UI), set **DROPDOWN_CUSTOM=1**. The script will click the dropdown to open it, then click the option by text. Optionally set **DROPDOWN_OPTION_SELECTOR** (default: `.mud-list-item, [role='option'], .mud-select-item`) if your app uses different option elements.
4. **Debug in visible browser:** Set **HEADLESS=0** to see the browser while the script runs.

Example for the MEP form:

```bash
TARGET_URL=https://apps.mep.go.cr/formulario
USE_PLAYWRIGHT=1
DROPDOWN_SELECTOR=#regionalSelect
DROPDOWN_OPTION_VALUE=53
DROPDOWN_OPTION_LABEL=Regional Educación Perez Zeledon
CONTENT_SELECTOR=.mud-table-container
TABLE_FILTER_ESPECIALIDAD_VALUE=Español
DROPDOWN_WAIT_AFTER_MS=2000
```

First run will download the browser (Chromium) if needed. The GitHub Actions workflow already installs Chromium.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| TARGET_URL | Yes | URL to monitor |
| CONTENT_SELECTOR | No | CSS selector for content (default: body) |
| USE_PLAYWRIGHT | No | Set to `1` or `true` to use browser (for JS/dropdown pages) |
| DROPDOWN_SELECTOR | No | CSS selector for dropdown when using Playwright |
| DROPDOWN_OPTION_VALUE | No | Option value to select (native `<select>`) |
| DROPDOWN_OPTION_LABEL | No | Option label to select (text of the option) |
| DROPDOWN_CUSTOM | No | Set to `1` for custom dropdowns (MudBlazor, etc.): click to open, then click option |
| DROPDOWN_OPTION_SELECTOR | No | Selector for option elements when DROPDOWN_CUSTOM=1 (default: .mud-list-item, [role='option']) |
| DROPDOWN_WAIT_AFTER_MS | No | Ms to wait after selecting dropdown (default: 2000) |
| HEADLESS | No | Set to `0` or `false` to show browser (default: true) |
| TABLE_CELL_NAMES | No | Comma-separated `data-label` columns to parse (default: Vacante, Especialidad, Clase de Puesto, Institución, Lecciones) |
| TABLE_FILTER_ESPECIALIDAD | No | Column name for especialidad (default: Especialidad) |
| TABLE_FILTER_ESPECIALIDAD_VALUE | No | Exact match, comma-separated (e.g. `Español` or `Español,Inglés`) |
| TABLE_FILTER_PUESTO | No | Column name for puesto (e.g. `Clase de Puesto`) |
| TABLE_FILTER_PUESTO_VALUE | No | Exact match for puesto; leave empty to skip |
| TABLE_FILTER_INSTITUCION | No | Column name for institución |
| TABLE_FILTER_INSTITUCION_VALUE | No | Exact match for institución; leave empty to skip |
| TABLE_FILTER_LECCIONES | No | Column name for lecciones |
| TABLE_FILTER_LECCIONES_VALUE | No | Exact match for lecciones; leave empty to skip |
| NTFY_TOPIC | No | ntfy.sh topic for notifications |
| TELEGRAM_BOT_TOKEN | No | Telegram bot token |
| TELEGRAM_CHAT_ID | No | Telegram chat ID |
| BASELINE_PATH | No | Path to baseline file (default: `./data/baseline.json`) |

## Manual run

```bash
npm run monitor
```

Or use **Actions → Vacantes de Profesores - MEP → Run workflow** in GitHub.
