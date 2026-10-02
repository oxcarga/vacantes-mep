---
name: db-backup
description: >-
  Export a Firestore backup from the local emulator or the remote project into
  the repository backups/ folder. Use when the user runs /db-backup, asks for a
  Firestore backup, or says to back up the local or remote database.
disable-model-invocation: true
---

# Firestore backup

Export every Firestore document into `backups/` at the repository root. The folder is gitignored. Do not commit it, and do not print document contents.

## Target

Read the argument after `/db-backup`:

- `local` — Firestore emulator
- `remote` or `remoto` — the remote Firestore project

If the argument is missing or anything else, ask which one and stop. Do not guess and do not run the export.

## Export

Run this from the repository root and wait until it finishes.

Local:

```bash
node .cursor/skills/db-backup/scripts/export-firestore.mjs local
```

Remote:

```bash
node .cursor/skills/db-backup/scripts/export-firestore.mjs remote
```

If the user also names a GCP project id, pass it through:

```bash
node .cursor/skills/db-backup/scripts/export-firestore.mjs remote --project <gcp-project-id>
```

The script writes one file, `backups/<local|remote>-YYYYMMDD-HHMMSS.json`. Every root collection is a key under `collections` in that file. Subcollections stay nested inside each document. Timestamps, geopoints, references, and bytes are tagged with `__type`.

## Failures

- Local, and nothing is listening on `127.0.0.1:8080`: say so and stop. The emulator is `npm run emulators` (`demo-gomep-vacantes`). Do not start it yourself.
- Remote, and the script cannot find a project id: ask for the GCP project id and stop. `demo-gomep-vacantes` is only the emulator.
- Remote, and credentials are missing: say that Application Default Credentials are required and stop. Do not run an interactive login.

## Report

From the script's JSON stdout, report the target, project id, backup path, document count, and the count per collection.
