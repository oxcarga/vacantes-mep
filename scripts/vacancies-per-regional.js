#!/usr/bin/env node
/**
 * Scrapes vacancies for every regional listed in data/regionales.json and
 * writes the combined results to data/vacantes_por_regional.json.
 *
 * Prefers the regionales file when present; otherwise reads the dropdown.
 *
 * Usage:
 *   npm run scrape:all
 *   node scripts/vacancies-per-regional.js
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";
import {
  scrapeRegional,
  waitForNativeOptions,
  listNativeOptions,
} from "../src/scrape/index.js";
import { parseVacancies, uniqueVacancies } from "../src/vacancies/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGIONALES_PATH = resolve(__dirname, "../data/regionales.json");
const OUT_PATH = resolve(__dirname, "../data/vacantes_por_regional.json");

const config = loadConfig();

let regionales;
try {
  regionales = JSON.parse(await readFile(REGIONALES_PATH, "utf8"));
} catch {
  regionales = null;
}

const { chromium } = await import("playwright");
console.log(`Abriendo ${config.targetUrl} …`);

const browser = await chromium.launch({
  headless: config.headless,
  args: config.launchArgs.length > 0 ? config.launchArgs : undefined,
});

const results = [];

try {
  const page = await browser.newPage();
  await page.goto(config.targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  console.log(`Esperando el dropdown "${config.dropdownSelector}" …`);
  await waitForNativeOptions(page, config.dropdownSelector, {
    timeout: 20_000,
  });
  regionales ??= await listNativeOptions(page, config.dropdownSelector);
  console.log(`Dropdown listo. Procesando ${regionales.length} regionales…\n`);

  for (const [idx, regional] of regionales.entries()) {
    const scrapedAt = new Date().toISOString();
    const progress = `[${idx + 1}/${regionales.length}]`;
    console.log(`${progress} ${regional.label} (value=${regional.value}) …`);

    let vacantes = [];
    try {
      const pages = await scrapeRegional(page, config, regional);
      vacantes = uniqueVacancies(
        pages.flatMap((html) =>
          parseVacancies(html, {
            contentSelector: config.contentSelector,
            cellNames: config.cellNames,
          }),
        ).map((vacancy) => ({ ...vacancy, Regional: regional.label })),
        config.identityCellNames,
      );
      console.log(`         ${vacantes.length} vacantes en ${pages.length} página(s).`);
    } catch (err) {
      console.error(`         Error: ${err.message}`);
    }

    results.push({
      regional,
      total: vacantes.length,
      scrapedAt,
      vacantes,
    });
  }
} finally {
  await browser.close().catch(() => {});
}

await writeFile(OUT_PATH, JSON.stringify(results, null, 2) + "\n", "utf8");

const grandTotal = results.reduce((sum, r) => sum + r.total, 0);
console.log(`\n✓ Guardado en ${OUT_PATH}`);
console.log(
  `  ${grandTotal} vacantes en ${results.length} regionales (${results.filter((r) => r.total > 0).length} con al menos una).`,
);
