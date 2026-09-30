import * as cheerio from "cheerio";
import { DEFAULT_CELL_NAMES } from "../config.js";

/**
 * Collapses whitespace in a table cell's text content to a single space.
 * @param {string | null | undefined} text - Raw cell text from cheerio.
 * @returns {string}
 */
function cellText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Parses vacancy rows from a page's HTML string. Looks for `<td data-label="…">`
 * cells inside `<tbody>` rows, scoped to `contentSelector` when provided.
 * @param {string} html - Raw HTML of a scraped page.
 * @param {{ contentSelector?: string, cellNames?: string[] }} [options]
 * @returns {Object[]} Array of plain vacancy objects keyed by the configured cell names.
 *   When the row carries `data-aplicar`, the object also includes `Aplicar`
 *   with the absolute URL of that vacancy's Aplicar button.
 */
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
    const aplicar = cellText($row.attr("data-aplicar"));
    if (aplicar) vacancy.Aplicar = aplicar;
    if (cellNames.some((name) => vacancy[name])) {
      rows.push(vacancy);
    }
  });
  return rows;
}

/**
 * Keeps only the rows that satisfy every active column filter.
 * A filter is skipped when its column or values list is empty.
 * @param {Object[]} rows - Parsed vacancy objects.
 * @param {{ column: string, values: string[] }[]} [columnFilters=[]] - Filters to apply.
 * @returns {Object[]} Filtered subset of `rows`.
 */
export function filterVacancies(rows, columnFilters = []) {
  return rows.filter((row) =>
    columnFilters.every(({ column, values }) => {
      if (!column || !values?.length) return true;
      return values.includes(String(row[column] ?? "").trim());
    }),
  );
}
