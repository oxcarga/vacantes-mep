#!/usr/bin/env node
/**
 * One-shot import of a JSON baseline (or a dump of openings) into Firestore.
 *
 * Usage:
 *   FIRESTORE_PROJECT_ID=your-project node scripts/import-to-firestore.js [path]
 *
 * Default path: data/baseline.json (the JSON store format).
 * Also accepts a raw array of vacancy objects, or vacancies grouped by regional.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "../src/config.js";
import { createFirestoreStore } from "../src/store/firestore.js";
import { flattenBaselineVacancies } from "../src/store/json.js";

const inputPath = resolve(
  process.cwd(),
  process.argv[2] || process.env.BASELINE_PATH || "data/baseline.json",
);

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const vacancies = flattenBaselineVacancies(raw);
if (!vacancies) {
  throw new Error(
    `${inputPath} must be an array of vacancies or a baseline object with a vacancies array.`,
  );
}

const config = loadConfig();
if (!config.firestoreProjectId && !config.firestoreEmulatorHost) {
  throw new Error(
    "Set FIRESTORE_PROJECT_ID (or FIRESTORE_EMULATOR_HOST) before importing.",
  );
}

const store = await createFirestoreStore(config);
const startedAt = new Date().toISOString();
await store.commit({
  current: vacancies,
  added: vacancies,
  removed: [],
  changed: [],
  startedAt,
  contentHash: raw.contentHash || "import",
});
await store.close();

console.log(
  `Imported ${vacancies.length} openings from ${inputPath} into ${store.description}.`,
);
