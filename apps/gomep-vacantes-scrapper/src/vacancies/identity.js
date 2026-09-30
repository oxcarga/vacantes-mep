import { createHash } from "node:crypto";
import {
  DEFAULT_CELL_NAMES,
  DEFAULT_IDENTITY_CELL_NAMES,
} from "../config.js";

/**
 * Builds a stable string key for a vacancy by joining its cell values with a
 * Unit Separator character. Used for equality comparisons and deduplication.
 * @param {Object} vacancy - A parsed vacancy object.
 * @param {string[]} [cellNames=DEFAULT_CELL_NAMES] - Cell names whose values form the key.
 * @returns {string}
 */
export function vacancyKey(vacancy, cellNames = DEFAULT_CELL_NAMES) {
  return cellNames
    .map((name) => String(vacancy?.[name] ?? "").trim())
    .join("\u001f");
}

/**
 * Regional stamped on a vacancy after scrape, or `fallback` when missing.
 * @param {Object} vacancy
 * @param {string} [fallback=""]
 * @returns {string}
 */
export function vacancyRegional(vacancy, fallback = "") {
  return String(vacancy?.Regional ?? fallback ?? "").trim();
}

/**
 * Identity key that keeps the same Vacante in two regionales distinct.
 * @param {Object} vacancy
 * @param {string[]} [identityCellNames=DEFAULT_IDENTITY_CELL_NAMES]
 * @returns {string}
 */
export function vacancyScopeKey(
  vacancy,
  identityCellNames = DEFAULT_IDENTITY_CELL_NAMES,
) {
  return `${vacancyRegional(vacancy)}\u001f${vacancyKey(vacancy, identityCellNames)}`;
}

/**
 * Firestore / JSON document id for an opening: the MEP Vacante number.
 * @param {Object} vacancy - A parsed vacancy object.
 * @returns {string}
 */
export function vacancyId(vacancy) {
  const id = String(vacancy?.Vacante ?? "").trim();
  if (!id) {
    throw new Error("Cada vacante necesita un número de Vacante para usarlo como id");
  }
  return id;
}

/**
 * Returns a SHA-256 hex digest of the full sorted vacancy list. Useful for
 * quickly detecting whether anything changed without doing a full diff.
 * @param {Object[]} rows - Parsed vacancy objects.
 * @param {string[]} [cellNames=DEFAULT_CELL_NAMES]
 * @returns {string} 64-character hex digest.
 */
export function hashVacancies(rows, cellNames = DEFAULT_CELL_NAMES) {
  const canonical = rows
    .map(
      (row) =>
        `${vacancyRegional(row)}\u001f${vacancyKey(row, cellNames)}\u001f${String(row?.Aplicar ?? "").trim()}`,
    )
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Removes duplicate rows by their identity key, keeping only the first
 * occurrence. Handles repeated rows that may appear across paginated pages.
 * @param {Object[]} rows - Parsed vacancy objects, possibly with duplicates.
 * @param {string[]} [identityCellNames=DEFAULT_IDENTITY_CELL_NAMES]
 * @returns {Object[]} Deduplicated array preserving original order.
 */
export function uniqueVacancies(
  rows,
  identityCellNames = DEFAULT_IDENTITY_CELL_NAMES,
) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = vacancyScopeKey(row, identityCellNames);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Returns the subset of cell names that are not part of the identity key.
 * These are the "detail" columns whose changes trigger a "modified" report
 * rather than a removal + addition pair.
 * @param {string[]} cellNames - All configured cell names.
 * @param {string[]} identityCellNames - Identity-only cell names.
 * @returns {string[]}
 */
export function detailCellNames(cellNames, identityCellNames) {
  return cellNames.filter((name) => !identityCellNames.includes(name));
}
