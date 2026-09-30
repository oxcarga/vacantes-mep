---
name: "/scrape-to-db-local"
id: "scrape-to-db-local"
category: "Workflow"
description: "Scrape MEP vacancies into the local Firestore emulator"
---

Run this command from the repository root and wait until it finishes. Do not write to the JSON baseline.

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIRESTORE_PROJECT_ID=demo-gomep-vacantes npm run scrape
```

The Firestore emulator must already be listening on `127.0.0.1:8080` (`npm run emulators` from the repo root). If it is not, say so and stop.

If Playwright cannot find Chromium because `PLAYWRIGHT_BROWSERS_PATH` points at a sandbox cache, rerun the same command with `PLAYWRIGHT_BROWSERS_PATH` set to `$HOME/Library/Caches/ms-playwright`.

Report the store path and the vacancy counts from the command output.
