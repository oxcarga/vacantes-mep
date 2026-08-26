import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as cheerio from "cheerio";

export const DEFAULT_CELL_NAMES = [
  "Vacante",
  "Especialidad",
  "Clase de Puesto",
  "Institución",
  "Lecciones",
];

const MAX_MESSAGE_LENGTH = 3900;

export function vacancyId(vacancy, cellNames = DEFAULT_CELL_NAMES) {
  return cellNames.map((name) => String(vacancy[name] ?? "").trim()).join("\u001f");
}

export function parseVacancies(
  html,
  {
    contentSelector = "",
    cellNames = DEFAULT_CELL_NAMES,
    filterLabel = "",
    filterValue = "",
  } = {},
) {
  const $ = cheerio.load(html);
  const names = cellNames.length ? cellNames : DEFAULT_CELL_NAMES;
  const root =
    contentSelector && contentSelector !== "body"
      ? $(contentSelector).first()
      : null;

  if (contentSelector && contentSelector !== "body" && !root.length) {
    throw new Error(`No se encontró el selector ${contentSelector}`);
  }

  const scope = root && root.length ? root : $.root();
  const filter = String(filterValue ?? "").trim();
  const vacancies = [];

  scope.find("tbody tr").each((_, row) => {
    const $row = $(row);
    const vacancy = {};
    for (const name of names) {
      vacancy[name] = $row.find(`td[data-label="${name}"]`).text().trim();
    }
    if (!names.some((name) => vacancy[name])) {
      return;
    }
    if (filterLabel && filter && vacancy[filterLabel] !== filter) {
      return;
    }
    vacancies.push(vacancy);
  });

  return vacancies;
}

export function diffVacancies(
  previous,
  current,
  cellNames = DEFAULT_CELL_NAMES,
) {
  const prevMap = new Map(
    (previous ?? []).map((vacancy) => [vacancyId(vacancy, cellNames), vacancy]),
  );
  const currMap = new Map(
    (current ?? []).map((vacancy) => [vacancyId(vacancy, cellNames), vacancy]),
  );
  const added = (current ?? []).filter(
    (vacancy) => !prevMap.has(vacancyId(vacancy, cellNames)),
  );
  const removed = (previous ?? []).filter(
    (vacancy) => !currMap.has(vacancyId(vacancy, cellNames)),
  );
  return { added, removed };
}

export function formatVacancyLines(vacancies, cellNames = DEFAULT_CELL_NAMES) {
  return vacancies
    .map(
      (vacancy) =>
        `• ${cellNames.map((name) => vacancy[name] ?? "").join(" | ")}`,
    )
    .join("\n____\n");
}

function truncate(text) {
  if (text.length <= MAX_MESSAGE_LENGTH) return text;
  return `${text.slice(0, MAX_MESSAGE_LENGTH - 16)}\n… (truncado)`;
}

export function buildNotification({
  current,
  added,
  removed,
  isFirstRun,
  especialidad,
  regional,
  cellNames = DEFAULT_CELL_NAMES,
}) {
  const subject = especialidad || "la especialidad";
  const place = regional || "la regional";

  if (isFirstRun) {
    const title = `Hay ${current.length} vacantes de ${subject} disponibles en la ${place}`;
    const body =
      current.length > 0
        ? formatVacancyLines(current, cellNames)
        : "No hay vacantes disponibles con ese filtro.";
    return { shouldNotify: true, title, body: truncate(body) };
  }

  if (added.length === 0 && removed.length === 0) {
    return { shouldNotify: false, title: "", body: "" };
  }

  const parts = [];
  if (added.length > 0) {
    parts.push(
      `${added.length} nueva(s):\n${formatVacancyLines(added, cellNames)}`,
    );
  }
  if (removed.length > 0) {
    parts.push(
      `${removed.length} ya no aparecen:\n${formatVacancyLines(removed, cellNames)}`,
    );
  }

  return {
    shouldNotify: true,
    title: `Cambio en vacantes de ${subject} en la ${place}`,
    body: truncate(parts.join("\n\n")),
  };
}

export function loadBaseline(path) {
  if (!path || !existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (!data || !Array.isArray(data.vacancies)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveBaseline(path, vacancies) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        vacancies,
      },
      null,
      2,
    )}\n`,
  );
}
