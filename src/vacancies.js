import * as cheerio from "cheerio";

export const DEFAULT_CELL_NAMES = [
  "Vacante",
  "Especialidad",
  "Clase de Puesto",
  "Institución",
  "Lecciones",
];

export const NTFY_MAX_BYTES = 3900;

export function parseCellNames(raw) {
  const names = String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return names.length > 0 ? names : [...DEFAULT_CELL_NAMES];
}

export function splitFilterValues(raw) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseVacancies(html, cellNames = DEFAULT_CELL_NAMES) {
  const $ = cheerio.load(html || "");
  const rows = [];
  $("tbody tr").each((_, row) => {
    const $row = $(row);
    const vacancy = {};
    for (const name of cellNames) {
      vacancy[name] = $row.find(`td[data-label="${name}"]`).first().text().trim();
    }
    if (Object.values(vacancy).some((value) => value)) {
      rows.push(vacancy);
    }
  });
  return rows;
}

export function filterVacancies(rows, columnFilters = []) {
  return rows.filter((row) =>
    columnFilters.every(({ column, values }) => {
      if (!column || !values?.length) return true;
      return values.includes((row[column] ?? "").trim());
    }),
  );
}

export function vacancyKey(vacancy, cellNames = DEFAULT_CELL_NAMES) {
  return cellNames.map((name) => vacancy?.[name] ?? "").join("|");
}

export function uniqueVacancies(rows, cellNames = DEFAULT_CELL_NAMES) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = vacancyKey(row, cellNames);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function diffVacancies(previous = [], current = [], cellNames = DEFAULT_CELL_NAMES) {
  const previousKeys = new Set(previous.map((row) => vacancyKey(row, cellNames)));
  const currentKeys = new Set(current.map((row) => vacancyKey(row, cellNames)));
  const added = current.filter((row) => !previousKeys.has(vacancyKey(row, cellNames)));
  const removed = previous.filter((row) => !currentKeys.has(vacancyKey(row, cellNames)));
  return {
    added,
    removed,
    unchanged: added.length === 0 && removed.length === 0,
  };
}

export function formatVacancy(vacancy, cellNames = DEFAULT_CELL_NAMES) {
  const institution = vacancy?.Institución || vacancy?.[cellNames[0]] || "";
  const details = cellNames
    .filter((name) => name !== "Institución" && vacancy?.[name])
    .map((name) => `${name}: ${vacancy[name]}`)
    .join(" · ");
  if (!institution && !details) return "• (vacante)";
  return details ? `• ${institution}\n  ${details}` : `• ${institution}`;
}

export function formatVacancyList(vacancies, cellNames = DEFAULT_CELL_NAMES) {
  return vacancies.map((row) => formatVacancy(row, cellNames)).join("\n");
}

export function truncateUtf8(text, maxBytes = NTFY_MAX_BYTES) {
  const value = String(text ?? "");
  const buf = Buffer.from(value, "utf8");
  if (buf.length <= maxBytes) return value;
  const suffix = "\n… (mensaje recortado)";
  const suffixBytes = Buffer.byteLength(suffix, "utf8");
  const limit = Math.max(0, maxBytes - suffixBytes);
  let end = Math.min(buf.length, limit);
  while (end > 0 && (buf[end] & 0xc0) === 0x80) {
    end -= 1;
  }
  return `${buf.subarray(0, end).toString("utf8")}${suffix}`;
}

export function specialtyLabel(values) {
  return values.length > 0 ? values.join(", ") : "todas las especialidades";
}

export function buildNotification({
  firstRun = false,
  current = [],
  added = [],
  removed = [],
  specialtyLabel: specialty = "todas las especialidades",
  regionalLabel = "la regional",
  cellNames = DEFAULT_CELL_NAMES,
} = {}) {
  if (firstRun) {
    return {
      title: `Monitoreo iniciado: ${current.length} vacantes de ${specialty} en la ${regionalLabel}`,
      body: "Se guardó la línea base. Recibirás una notificación cuando haya cambios.",
    };
  }

  if (added.length === 0 && removed.length === 0) {
    return null;
  }

  let title;
  if (added.length > 0 && removed.length === 0) {
    const noun = added.length === 1 ? "vacante nueva" : "vacantes nuevas";
    title = `${added.length} ${noun} de ${specialty} en la ${regionalLabel}`;
  } else if (removed.length > 0 && added.length === 0) {
    const noun =
      removed.length === 1 ? "vacante ya no está" : "vacantes ya no están";
    title = `${removed.length} ${noun} en la ${regionalLabel}`;
  } else {
    title = `Cambios en vacantes de ${specialty} en la ${regionalLabel} (+${added.length} / -${removed.length})`;
  }

  const sections = [];
  if (added.length > 0) {
    sections.push(`Nuevas (${added.length}):\n${formatVacancyList(added, cellNames)}`);
  }
  if (removed.length > 0) {
    sections.push(`Ya no están (${removed.length}):\n${formatVacancyList(removed, cellNames)}`);
  }

  return { title, body: sections.join("\n\n") };
}
