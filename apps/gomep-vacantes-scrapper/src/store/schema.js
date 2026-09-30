import { COLLECTIONS } from "@gomep/schema";

export { COLLECTIONS };

/**
 * Builds a one-line summary from the identity cells of a vacancy.
 * @param {Object} vacancy
 * @param {string[]} identityCellNames
 * @returns {string}
 */
export function summarize(vacancy, identityCellNames) {
  return identityCellNames
    .map((name) => vacancy[name])
    .filter(Boolean)
    .join(" | ");
}
