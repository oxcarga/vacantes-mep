---
name: db-put-backup
description: >-
  Restore a Firestore backup into the local emulator after deleting every
  document. Use when the user runs /db-put-backup, asks to restore or load a
  backup into local Firestore, or gives a backup filename or path.
disable-model-invocation: true
---

# Restore a local Firestore backup

Replace the local Firestore emulator with a JSON file produced by `/db-backup`. The target is always the emulator at `127.0.0.1:8080` (`demo-gomep-vacantes`). Never restore into the remote project.

The restore deletes every document in that emulator before writing. Do not print document contents.

## Choose the backup

Read the argument after `/db-put-backup`.

- No argument: list the files in `backups/` and ask the user which one to restore. Stop. Do not pick one and do not restore in that turn.
- A filename, with no path separator: the file is `backups/<filename>`. If that name omits `.json` and `backups/<filename>.json` exists, use the `.json` file.
- A path: use that file. It may be relative to the repository root or absolute.

List with this command, from the repository root, and wait until it finishes:

```bash
node .cursor/skills/db-put-backup/scripts/import-firestore.mjs --list
```

From the JSON, show each file's name, path, source, exported time, and document count. If the list is empty, say that `backups/` has nothing to restore and stop.

## Restore

Run this from the repository root and wait until it finishes. Pass the name or path through unchanged.

```bash
node .cursor/skills/db-put-backup/scripts/import-firestore.mjs <name-or-path>
```

The script clears the emulator, then writes every collection in the file. Subcollections are nested inside each document. Values tagged with `__type` (`timestamp`, `geopoint`, `ref`, `bytes`) are restored as Firestore types.

## Failures

- Nothing is listening on `127.0.0.1:8080`: say so and stop. The emulator is `npm run emulators`. Do not start it yourself.
- The name or path does not exist, or the file is not a `/db-backup` JSON file: say so and stop. Do not restore a different backup.
- The script says the emulator was already cleared and the restore did not finish: report that. Do not claim the backup was loaded.

## Report

From the script's JSON stdout, report that the local database was cleared, the backup path, the project id, the document count, and the count per collection.
