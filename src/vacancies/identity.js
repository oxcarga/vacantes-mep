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
 * Computes a short, stable SHA-256 identifier for a vacancy within a regional.
 * Used as the primary key of the `openings` table so history survives across
 * runs and machines even when details like lecciones change.
 * @param {Object} vacancy - A parsed vacancy object.
 * @param {string[]} [identityCellNames=DEFAULT_IDENTITY_CELL_NAMES] - Cells that define the identity.
 * @param {string} [regional=""] - Regional name or value, included to avoid collisions across regionales.
 * @returns {string} 24-character hex string.
 */
export function vacancyId(
  vacancy,
  identityCellNames = DEFAULT_IDENTITY_CELL_NAMES,
  regional = "",
) {
  const key = `${vacancyRegional(vacancy, regional)}\u001f${vacancyKey(vacancy, identityCellNames)}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
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
    .map((row) => `${vacancyRegional(row)}\u001f${vacancyKey(row, cellNames)}`)
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
