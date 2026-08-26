import * as cheerio from "cheerio";

const LABEL_TO_FIELD = {
  Vacante: "vacante",
  Especialidad: "especialidad",
  "Clase de Puesto": "puesto",
  Institución: "institucion",
  Lecciones: "lecciones",
};

/**
 * Parse MudBlazor (or similar) table rows into opening objects.
 * Optionally keep only rows whose Especialidad cell matches especialidadFilter.
 */
export function parseVacancyRows(html, { especialidadFilter, cellNames } = {}) {
  const $ = cheerio.load(html || "");
  const labels =
    Array.isArray(cellNames) && cellNames.length > 0
      ? cellNames
      : Object.keys(LABEL_TO_FIELD);
  const rows = [];

  $("tbody tr").each((_, row) => {
    const $row = $(row);
    const opening = {
      vacante: "",
      especialidad: "",
      puesto: "",
      institucion: "",
      lecciones: "",
    };

    for (const label of labels) {
      const field = LABEL_TO_FIELD[label];
      if (!field) continue;
      opening[field] = $row.find(`td[data-label="${label}"]`).first().text().trim();
    }

    if (!opening.vacante && !opening.institucion && !opening.especialidad) {
      return;
    }
    if (especialidadFilter && opening.especialidad !== especialidadFilter) {
      return;
    }
    rows.push(opening);
  });

  return rows;
}

export function extractHtml(html, selector) {
  const $ = cheerio.load(html);
  const el = selector ? $(selector).first() : $("body").first();
  if (!el.length) return $.html();
  return el.html() || $.html();
}
