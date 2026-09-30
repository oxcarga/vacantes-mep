/**
 * Shared Firestore layout for gomep-vacantes and gomep-vacantes-scrapper.
 * Collection names in Firestore are Spanish.
 */

export const COLLECTIONS = Object.freeze({
  vacantes: "vacantes",
  corridasScrape: "corridas_scrape",
  usuarios: "usuarios",
  regionales: "regionales",
  especialidades: "especialidades",
  suscripciones: "suscripciones",
});

export const DEFAULT_FIRESTORE_PROJECT_ID = "demo-gomep-vacantes";
