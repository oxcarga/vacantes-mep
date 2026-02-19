# Website Content Monitor

Monitor a website every 30 minutes for new content. When changes are detected, you receive a notification via Telegram or ntfy.sh.

## Flow

1. **Fetch** — HTTP request to the target URL (or run a real browser with Playwright if the page needs JavaScript or a dropdown)
2. **Parse** — Extract content (optional CSS selector)
3. **Compare** — Hash content and compare with last run
4. **Persist** — Store baseline for next run
5. **Notify** — Send Telegram and/or ntfy.sh notification on change

## Quick Start (Local)

```bash
cp .env.example .env
# Edit .env: set TARGET_URL and at least one of NTFY_TOPIC or TELEGRAM_*

npm install
npm run monitor
```

Run locally with `cron` for 30-minute checks:

```bash
# Edit crontab: crontab -e
*/30 * * * * cd /path/to/website-content-monitor && npm run monitor
```

## GitHub Actions (Cloud)

1. Fork or clone this repo
2. Add repository secrets/variables:
   - **TARGET_URL** (required) — URL to monitor (e.g. `https://example.com`)
   - **CONTENT_SELECTOR** (optional) — CSS selector (e.g. `.main-content`, `#articles`)
   - **NTFY_TOPIC** (optional) — ntfy.sh topic for push notifications
   - **TELEGRAM_BOT_TOKEN** (optional) — From @BotFather
   - **TELEGRAM_CHAT_ID** (optional) — Your chat ID

3. Push to GitHub. The workflow runs every 30 minutes.

### Getting Telegram credentials

1. Message [@BotFather](https://t.me/BotFather), create a bot, copy the token
2. Send a message to your new bot
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` — your `chat.id` is in the response

### Getting ntfy.sh notifications

1. Pick a unique topic name (e.g. `my-website-monitor`)
2. Add `NTFY_TOPIC=my-website-monitor` to secrets
3. Subscribe: open https://ntfy.sh/my-website-monitor or use the ntfy app

## Pages that need a dropdown or JavaScript

If the data you want to monitor only appears **after** selecting an option in a dropdown (or after other client-side JavaScript runs), use **Playwright** so the script runs a real browser, selects the dropdown, then captures the resulting content.

1. Set `USE_PLAYWRIGHT=1` (or `true`) in your `.env`.
2. Set dropdown options:
   - **DROPDOWN_SELECTOR** — CSS selector for the dropdown (e.g. `#regionalSelect`, `select[name=range]`).
   - **DROPDOWN_OPTION_VALUE** or **DROPDOWN_OPTION_LABEL** — which option to select (value or visible text).
   - **DROPDOWN_WAIT_AFTER_MS** — milliseconds to wait after selecting (default: `2000`).
3. **Custom dropdowns (MudBlazor, etc.):** If the dropdown is not a native `<select>` (e.g. MudBlazor, Material-UI), set **DROPDOWN_CUSTOM=1**. The script will click the dropdown to open it, then click the option by text. Optionally set **DROPDOWN_OPTION_SELECTOR** (default: `.mud-list-item, [role='option'], .mud-select-item`) if your app uses different option elements.
4. **Debug in visible browser:** Set **HEADLESS=0** to see the browser while the script runs.

Example for a **native `<select>`**:

```bash
TARGET_URL=https://example.com/dashboard
USE_PLAYWRIGHT=1
DROPDOWN_SELECTOR=#dateRange
DROPDOWN_OPTION_LABEL=Last 7 days
CONTENT_SELECTOR=.report-content
```

Example for a **custom dropdown (e.g. MudBlazor)**:

```bash
TARGET_URL=https://apps.example.com/form
USE_PLAYWRIGHT=1
DROPDOWN_CUSTOM=1
DROPDOWN_SELECTOR=#regionalSelect
DROPDOWN_OPTION_LABEL=Regional Educación Perez Zeledon
CONTENT_SELECTOR=.mud-table-root
DROPDOWN_WAIT_AFTER_MS=10000
```

First run will download the browser (Chromium) if needed. For **GitHub Actions**, add a step to install the browser, e.g. `npx playwright install chromium`.

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
| TABLE_FILTER_DATA_LABEL | No | Keep only rows where `<td data-label="...">` equals TABLE_FILTER_VALUE (e.g. Especialidad) |
| TABLE_FILTER_VALUE | No | Text that the data-label cell must have (e.g. Español). Use with TABLE_FILTER_DATA_LABEL. |
| NTFY_TOPIC | No | ntfy.sh topic for notifications |
| TELEGRAM_BOT_TOKEN | No | Telegram bot token |
| TELEGRAM_CHAT_ID | No | Telegram chat ID |
| BASELINE_PATH | No | Path to baseline file (default: ./data/baseline.json) |

## Manual run

```bash
TARGET_URL=https://example.com npm run monitor
```

Or use **Actions → Website Content Monitor → Run workflow** in GitHub.
