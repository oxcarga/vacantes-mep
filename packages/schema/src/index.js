/**
 * Shared Firestore layout for gomep-vacantes and gomep-vacantes-scrapper.
 *
 * A later `subscriptions` collection will let users watch a regional +
 * especialidad pair. Do not create it until that product ships; the
 * denormalized `especialidad` field on `openings` is already there so
 * those queries will not need another migration.
 */

export const COLLECTIONS = Object.freeze({
  openings: "openings",
  scrapeRuns: "scrape_runs",
});

export const DEFAULT_FIRESTORE_PROJECT_ID = "demo-gomep-vacantes";
