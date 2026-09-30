/**
 * Shared Firestore layout for gomep-vacantes and gomep-vacantes-scrapper.
 * Collection names in Firestore are Spanish.
 */

export const COLLECTIONS: Readonly<{
  vacantes: "vacantes";
  corridasScrape: "corridas_scrape";
  usuarios: "usuarios";
  regionales: "regionales";
  especialidades: "especialidades";
  suscripciones: "suscripciones";
}>;

export const DEFAULT_FIRESTORE_PROJECT_ID: "demo-gomep-vacantes";

/** Scrape cells stored as a map on each vacante. Keys are the MEP column labels. */
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

export type AccountRole = "docente" | "admin";

export type SubscriptionStatus = "active" | "inactive";

export type SubscriptionEndReason = "removed" | "expired" | null;

export type ReminderState = "sent" | "skipped";

/** `vacantes/{id}` — `id` is the MEP Vacante number. */
export type VacanteDocument = {
  regional: string;
  regionalValue: string;
  especialidad: string;
  summary: string;
  fields: VacancyFields;
  firstSeen: string;
  lastSeen: string;
  active: boolean;
};

/** @deprecated Use VacanteDocument */
export type OpeningDocument = VacanteDocument;

/** `corridas_scrape/{autoId}` */
export type CorridaScrapeDocument = {
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

/** @deprecated Use CorridaScrapeDocument */
export type ScrapeRunDocument = CorridaScrapeDocument;

/** `usuarios/{uid}` */
export type UsuarioDocument = {
  name: string;
  email: string;
  phone: string;
  role: AccountRole;
  createdAt: string;
};

/** `regionales/{value}` — `value` is the MEP dropdown option value. */
export type RegionalDocument = {
  label: string;
  lastSeen: string;
};

/** `especialidades/{sha256}` — id is SHA-256 of the exact specialty text. */
export type EspecialidadDocument = {
  name: string;
  lastSeen: string;
};

/** `suscripciones/{autoId}` */
export type SuscripcionDocument = {
  uid: string;
  regionalValue: string;
  especialidad: string;
  status: SubscriptionStatus;
  createdAt: string;
  expiresAt: string;
  endedAt: string | null;
  endReason: SubscriptionEndReason;
  reminders: Partial<Record<"7" | "3" | "2" | "0", ReminderState>>;
};
