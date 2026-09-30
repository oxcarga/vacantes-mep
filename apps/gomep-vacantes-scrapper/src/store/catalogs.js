import { createHash } from "node:crypto";

/**
 * Firestore document id for a specialty: SHA-256 of the exact cell text.
 * @param {string} name
 * @returns {string}
 */
export function especialidadId(name) {
  return createHash("sha256").update(String(name), "utf8").digest("hex");
}

/**
 * Maps vacancy ids to the MEP dropdown value from a successful scrape group list.
 * @param {Array<{ regional?: { value?: string }, vacantes?: Object[] }> | undefined} byRegional
 * @param {(vacancy: Object) => string} idOf
 * @returns {Map<string, string>}
 */
export function regionalValueByVacancyId(byRegional, idOf) {
  const map = new Map();
  if (!Array.isArray(byRegional)) return map;
  for (const group of byRegional) {
    const value = String(group?.regional?.value ?? "");
    for (const vacancy of group?.vacantes ?? []) {
      map.set(idOf(vacancy), value);
    }
  }
  return map;
}
