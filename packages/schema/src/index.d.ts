/**
 * Shared Firestore layout for gomep-vacantes and gomep-vacantes-scrapper.
 *
 * A later `subscriptions` collection will let users watch a regional +
 * especialidad pair. Do not create it until that product ships; the
 * denormalized `especialidad` field on `openings` is already there so
 * those queries will not need another migration.
 */

export const COLLECTIONS: Readonly<{
  openings: "openings";
  scrapeRuns: "scrape_runs";
}>;

export const DEFAULT_FIRESTORE_PROJECT_ID: "demo-gomep-vacantes";

/** Scrape cells stored as a map on each opening. Keys are the MEP column labels. */
export type VacancyFields = {
  Vacante?: string;
  Especialidad?: string;
  "Clase de Puesto"?: string;
  Institución?: string;
  Lecciones?: string;
  Regional?: string;
  /** Absolute URL opened by the Aplicar button. */
  Aplicar?: string;
  [cell: string]: string | undefined;
};

/** `openings/{id}` — `id` is the MEP Vacante number. */
export type OpeningDocument = {
  regional: string;
  especialidad: string;
  summary: string;
  fields: VacancyFields;
  firstSeen: string;
  lastSeen: string;
  active: boolean;
};

/** `scrape_runs/{autoId}` */
export type ScrapeRunDocument = {
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  regional: string;
  rowCount: number | null;
  contentHash: string | null;
  error: string | null;
  newCount: number | null;
  goneCount: number | null;
  changedCount: number | null;
};
