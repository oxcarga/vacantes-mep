import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { DEFAULT_CELL_NAMES, DEFAULT_IDENTITY_CELL_NAMES } from "./config.js";

export { DEFAULT_CELL_NAMES, DEFAULT_IDENTITY_CELL_NAMES };

/** ntfy rejects bodies over 4 KiB; leave room for headers. */
export const NTFY_MAX_BYTES = 3900;
/** Telegram counts characters, not bytes, and caps a message at 4096. */
export const TELEGRAM_MAX_CHARS = 4000;

/** Cell text wraps across lines in the rendered table; collapse it. */
function cellText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

export function parseVacancies(
  html,
  { contentSelector = "", cellNames = DEFAULT_CELL_NAMES } = {},
) {
  const $ = cheerio.load(html || "");
  const scoped = contentSelector && contentSelector !== "body";
  const root = scoped ? $(contentSelector).first() : $.root();

  if (scoped && root.length === 0) {
    throw new Error(`No se encontró el selector ${contentSelector}`);
  }

  const rows = [];
  root.find("tbody tr").each((_, row) => {
    const $row = $(row);
    const vacancy = {};
    for (const name of cellNames) {
      vacancy[name] = cellText(
        $row.find(`td[data-label="${name}"]`).first().text(),
      );
    }
    if (cellNames.some((name) => vacancy[name])) {
      rows.push(vacancy);
    }
  });
  return rows;
}

export function filterVacancies(rows, columnFilters = []) {
  return rows.filter((row) =>
    columnFilters.every(({ column, values }) => {
      if (!column || !values?.length) return true;
      return values.includes(String(row[column] ?? "").trim());
    }),
  );
}

export function vacancyKey(vacancy, cellNames = DEFAULT_CELL_NAMES) {
  return cellNames
    .map((name) => String(vacancy?.[name] ?? "").trim())
    .join("\u001f");
}

/**
 * Short, stable handle for a vacancy within a regional. Used as the primary
 * key of the openings table so history survives across runs and machines.
 */
export function vacancyId(
  vacancy,
  identityCellNames = DEFAULT_IDENTITY_CELL_NAMES,
  regional = "",
) {
  const key = `${regional}\u001f${vacancyKey(vacancy, identityCellNames)}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
}

export function hashVacancies(rows, cellNames = DEFAULT_CELL_NAMES) {
  const canonical = rows
    .map((row) => vacancyKey(row, cellNames))
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export function uniqueVacancies(
  rows,
  identityCellNames = DEFAULT_IDENTITY_CELL_NAMES,
) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = vacancyKey(row, identityCellNames);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detailCellNames(cellNames, identityCellNames) {
  return cellNames.filter((name) => !identityCellNames.includes(name));
}

/**
 * Compare two vacancy lists. A row whose identity cells match an earlier row
 * but whose detail cells differ is reported as changed rather than as a
 * removal plus an addition.
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
    (previous ?? []).map((row) => [vacancyKey(row, identityCellNames), row]),
  );
  const currentByKey = new Map(
    (current ?? []).map((row) => [vacancyKey(row, identityCellNames), row]),
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

export function formatVacancy(vacancy, cellNames = DEFAULT_CELL_NAMES) {
  const headline = vacancy?.["Institución"] || vacancy?.[cellNames[0]] || "";
  const details = cellNames
    .filter((name) => name !== "Institución" && vacancy?.[name])
    .map((name) => `${name}: ${vacancy[name]}`)
    .join(" · ");
  if (!headline && !details) return "• (vacante)";
  return details ? `• ${headline}\n  ${details}` : `• ${headline}`;
}

export function formatVacancyList(rows, cellNames = DEFAULT_CELL_NAMES) {
  return rows.map((row) => formatVacancy(row, cellNames)).join("\n");
}

function formatChange({ before, after }, cellNames, identityCellNames) {
  const diffs = detailCellNames(cellNames, identityCellNames)
    .filter((name) => (before[name] ?? "") !== (after[name] ?? ""))
    .map((name) => `${name}: ${before[name] || "—"} → ${after[name] || "—"}`)
    .join(" · ");
  return `${formatVacancy(after, identityCellNames)}\n  ${diffs}`;
}

/** Trim to a byte budget without splitting a multi-byte character in half. */
export function truncateUtf8(text, maxBytes = NTFY_MAX_BYTES) {
  const value = String(text ?? "");
  const buffer = Buffer.from(value, "utf8");
  if (buffer.length <= maxBytes) return value;

  const suffix = "\n… (mensaje recortado)";
  const limit = Math.max(0, maxBytes - Buffer.byteLength(suffix, "utf8"));
  let end = Math.min(buffer.length, limit);
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) end -= 1;
  return `${buffer.subarray(0, end).toString("utf8")}${suffix}`;
}

export function truncateChars(text, maxChars = TELEGRAM_MAX_CHARS) {
  const value = String(text ?? "");
  if (value.length <= maxChars) return value;
  const suffix = "\n… (mensaje recortado)";
  return `${value.slice(0, Math.max(0, maxChars - suffix.length))}${suffix}`;
}

export function specialtyLabel(values = []) {
  return values.length > 0 ? values.join(", ") : "todas las especialidades";
}

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm;
}

/**
 * Decide what (if anything) to send. The first run reports the full list so
 * you can confirm the filters are right; later runs report only the delta.
 */
export function buildNotification({
  isFirstRun = false,
  current = [],
  added = [],
  removed = [],
  changed = [],
  specialty = "todas las especialidades",
  regional = "la regional",
  cellNames = DEFAULT_CELL_NAMES,
  identityCellNames = DEFAULT_IDENTITY_CELL_NAMES,
} = {}) {
  if (isFirstRun) {
    return {
      title: `Hay ${current.length} ${plural(current.length, "vacante", "vacantes")} de ${specialty} en la ${regional}`,
      body:
        current.length > 0
          ? formatVacancyList(current, cellNames)
          : "No hay vacantes disponibles con ese filtro.",
    };
  }

  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    return null;
  }

  const summary = [];
  if (added.length > 0) {
    summary.push(
      `${added.length} ${plural(added.length, "nueva", "nuevas")}`,
    );
  }
  if (removed.length > 0) {
    summary.push(
      `${removed.length} ${plural(removed.length, "cerrada", "cerradas")}`,
    );
  }
  if (changed.length > 0) {
    summary.push(
      `${changed.length} ${plural(changed.length, "modificada", "modificadas")}`,
    );
  }

  const sections = [];
  if (added.length > 0) {
    sections.push(
      `Nuevas (${added.length}):\n${formatVacancyList(added, cellNames)}`,
    );
  }
  if (removed.length > 0) {
    sections.push(
      `Ya no aparecen (${removed.length}):\n${formatVacancyList(removed, cellNames)}`,
    );
  }
  if (changed.length > 0) {
    sections.push(
      `Modificadas (${changed.length}):\n${changed
        .map((change) => formatChange(change, cellNames, identityCellNames))
        .join("\n")}`,
    );
  }

  return {
    title: `Vacantes de ${specialty} en la ${regional}: ${summary.join(", ")} (${current.length} activas)`,
    body: sections.join("\n\n"),
  };
}
