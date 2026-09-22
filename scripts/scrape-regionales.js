#!/usr/bin/env node
/**
 * Scrapes all "Dirección Regional" options from the MEP form and writes them
 * to data/regionales.json as an array of { value, label } objects.
 *
 * Usage:
 *   node scripts/scrape-regionales.js
 */

import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";
import { listNativeOptions, waitForNativeOptions } from "../src/scrape/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../data/regionales.json");

const config = loadConfig();

const { chromium } = await import("playwright");

console.log(`Abriendo ${config.targetUrl} …`);
const browser = await chromium.launch({
  headless: config.headless,
  args: config.launchArgs.length > 0 ? config.launchArgs : undefined,
});

try {
  const page = await browser.newPage();
  await page.goto(config.targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const selector = config.dropdownSelector; // "#regionalSelect"
  console.log(`Esperando el dropdown "${selector}" …`);

  await waitForNativeOptions(page, selector, { timeout: 20_000 });
  const options = await listNativeOptions(page, selector);

  console.log(`Se encontraron ${options.length} opciones.`);
  options.forEach((o) => console.log(`  ${o.value}: ${o.label}`));

  await writeFile(OUT_PATH, JSON.stringify(options, null, 2) + "\n", "utf8");
  console.log(`\nGuardado en ${OUT_PATH}`);
} finally {
  await browser.close().catch(() => {});
}
