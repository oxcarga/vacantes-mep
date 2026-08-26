# Vacantes MEP monitor

Hourly scraper for teacher vacancies on the Costa Rican MEP form (`apps.mep.go.cr/formulario`). It launches Chromium (Playwright), selects a regional, filters the MudBlazor table, stores openings, and notifies **only when the list changes**.

## Flow

1. **Fetch** — Playwright (required) or plain HTTP
2. **Parse** — Cheerio table rows (`td[data-label]`)
3. **Diff** — Compare with `openings` in SQLite/Turso
4. **Persist** — Upsert current rows, mark gone ones inactive, write `scrape_runs`
5. **Notify** — ntfy.sh and/or Telegram on new / gone / changed rows (or every run if `DATABASE_URL` is unset)

## Quick start (local)

```bash
cp .env.example .env
# Set TARGET_URL, filters, NTFY_TOPIC, and DATABASE_URL=file:data/vacantes.db

npm install
npx playwright install chromium
npm test
npm run monitor
```

## GitHub Actions (current production)

The workflow in [`.github/workflows/monitor.yml`](.github/workflows/monitor.yml) runs hourly on `ubuntu-latest`.

1. Add the same **variables** as before (`TARGET_URL`, `USE_PLAYWRIGHT`, dropdown/table filters, …).
2. Add **secrets**:
   - `NTFY_TOPIC` (and Telegram if you use it)
   - `DATABASE_URL` — Turso URL, e.g. `libsql://YOUR-DB.turso.io`
   - `DATABASE_AUTH_TOKEN` — Turso token
3. Create a free [Turso](https://turso.tech) database (ephemeral GHA disks cannot keep SQLite). Without those secrets the job still scrapes but notifies every hour with no cache.

```bash
turso db create vacantes-mep
turso db show vacantes-mep --url
turso db tokens create vacantes-mep
```

## Docker / VPS (when you want cron + a local DB)

Use this when GitHub Actions cron is too coarse, you want Chromium cached in an image, or you add a small UI later.

```bash
cp .env.example .env
docker compose up -d --build   # hourly via supercronic
docker compose logs -f scraper
docker compose --profile once run --rm scraper-once   # one-off
```

Needs ~1 GB RAM (headless Chromium). SQLite lives on the `vacantes-data` volume (`DATABASE_URL=file:/app/data/vacantes.db`).

## Fly.io (managed alternative)

[`fly.toml`](fly.toml) builds the same Playwright image. After `fly deploy`:

```bash
fly volumes create vacantes_data --size 1
fly secrets set NTFY_TOPIC=...
fly deploy
fly machine update <id> --schedule "0 * * * *"
```

Or skip the volume and point `DATABASE_URL` / `DATABASE_AUTH_TOKEN` at Turso.

## Why not Vercel / Lambda?

`npm run spike:mep` (see [`scripts/mep-api-spike-findings.json`](scripts/mep-api-spike-findings.json)) shows the MEP page is **Blazor Server + MudBlazor**. Static HTML has no vacancy table, and there is no public JSON API. Chromium stays required, so host on GitHub Actions, Docker/VPS, or Fly — not Vercel/Netlify/stock Lambda.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| TARGET_URL | Yes | URL to monitor |
| CONTENT_SELECTOR | No | CSS selector for content (default: body) |
| USE_PLAYWRIGHT | Yes for MEP | `1` to use Chromium |
| DROPDOWN_SELECTOR | No | CSS selector for dropdown |
| DROPDOWN_OPTION_VALUE / DROPDOWN_OPTION_LABEL | No | Option to select |
| DROPDOWN_CUSTOM | Yes for MEP | `1` for MudBlazor/custom dropdowns |
| DROPDOWN_OPTION_SELECTOR | No | Option elements when DROPDOWN_CUSTOM=1 |
| DROPDOWN_WAIT_AFTER_MS | No | Wait after selecting (default 2000) |
| HEADLESS | No | `0` to show the browser |
| PLAYWRIGHT_LAUNCH_ARGS | No | Comma-separated Chromium flags (set in Docker) |
| TABLE_FILTER_ESPECIALIDAD | No | Column `data-label` to filter (e.g. Especialidad) |
| TABLE_FILTER_ESPECIALIDAD_VALUE | No | Filter value (e.g. Español) |
| TABLE_CELL_NAMES | No | Columns to store/notify |
| DATABASE_URL | Recommended | `file:data/vacantes.db` or Turso `libsql://...` |
| DATABASE_AUTH_TOKEN | Turso only | Turso auth token |
| NTFY_TOPIC | No | ntfy.sh topic |
| TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID | No | Telegram bot |

## Schema

- `openings` — natural key `regional + vacante + institucion + especialidad`; `active` flag; `first_seen` / `last_seen`
- `scrape_runs` — timestamp, ok/error, row count, content hash, new/gone/changed counts
