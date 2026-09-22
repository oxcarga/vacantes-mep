import {
  DEFAULT_CELL_NAMES,
  DEFAULT_IDENTITY_CELL_NAMES,
} from "../config.js";
import { detailCellNames, vacancyScopeKey } from "./identity.js";

/**
 * Compares two vacancy lists and categorises every change as an addition,
 * removal, or modification. A row whose identity cells match an earlier row
 * but whose detail cells differ is reported as changed rather than as a
 * removal plus an addition.
 * @param {Object[]} [previous=[]] - Vacancy list from the previous run.
 * @param {Object[]} [current=[]] - Vacancy list from the current run.
 * @param {{ cellNames?: string[], identityCellNames?: string[] }} [options]
 * @returns {{ added: Object[], removed: Object[], changed: { before: Object, after: Object }[], hasChanges: boolean }}
 */
export function diffVacancies(
  previous = [],
  current = [],
  {
    cellNames = DEFAULT_CELL_NAMES,
    identityCellNames = DEFAULT_IDENTITY_CELL_NAMES,
  } = {},
) {
  const details = detailCellNames(cellNames, identityCellNames);
  const previousByKey = new Map(
    (previous ?? []).map((row) => [vacancyScopeKey(row, identityCellNames), row]),
  );
  const currentByKey = new Map(
    (current ?? []).map((row) => [vacancyScopeKey(row, identityCellNames), row]),
  );

  const added = [];
  const changed = [];
  for (const [key, row] of currentByKey) {
    const before = previousByKey.get(key);
    if (!before) {
      added.push(row);
    } else if (
      details.some(
        (name) =>
          String(before[name] ?? "").trim() !== String(row[name] ?? "").trim(),
      )
    ) {
      changed.push({ before, after: row });
    }
  }

  const removed = [];
  for (const [key, row] of previousByKey) {
    if (!currentByKey.has(key)) removed.push(row);
  }

  return {
    added,
    removed,
    changed,
    hasChanges: added.length + removed.length + changed.length > 0,
  };
}
