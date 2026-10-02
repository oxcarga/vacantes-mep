---
name: "/db-put-backup"
id: "db-put-backup"
category: "Workflow"
description: "Restore a Firestore backup into the local emulator after wiping it"
---

Read and follow the project skill at `.cursor/skills/db-put-backup/SKILL.md`.

The argument after `/db-put-backup` is a backup filename or a path. A bare filename is resolved under `backups/`. If it is missing, list the files in `backups/` and ask the user to choose one. Do not restore until they choose. The restore always deletes every document in the local Firestore emulator before writing.
