#!/usr/bin/env node
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { setTimeout } from "node:timers/promises";
import dotenv from "dotenv";
import * as cheerio from "cheerio";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const TARGET_URL = (process.env.TARGET_URL || "https://example.com").trim();
const CONTENT_SELECTOR = process.env.CONTENT_SELECTOR || "body";
const HTML_PATH = join(process.cwd(), "data");

const USE_PLAYWRIGHT =
  process.env.USE_PLAYWRIGHT === "1" || process.env.USE_PLAYWRIGHT === "true";
const HEADLESS =
  process.env.HEADLESS !== "0" && process.env.HEADLESS !== "false"; // optional in .env; default true (headless). Set HEADLESS=0 to show browser
const DROPDOWN_SELECTOR = (process.env.DROPDOWN_SELECTOR || "").trim();
const DROPDOWN_OPTION_VALUE = (process.env.DROPDOWN_OPTION_VALUE || "").trim();
const DROPDOWN_OPTION_LABEL = (process.env.DROPDOWN_OPTION_LABEL || "").trim();
const DROPDOWN_WAIT_AFTER_MS = Number(
  process.env.DROPDOWN_WAIT_AFTER_MS || "2000",
  10,
);
const DROPDOWN_CUSTOM =
  process.env.DROPDOWN_CUSTOM === "1" || process.env.DROPDOWN_CUSTOM === "true";
const DROPDOWN_OPTION_SELECTOR =
  (process.env.DROPDOWN_OPTION_SELECTOR || "").trim() ||
  ".mud-list-item, [role='option'], .mud-select-item";

const TABLE_FILTER_DATA_LABEL = (
  process.env.TABLE_FILTER_DATA_LABEL || ""
).trim();
const TABLE_FILTER_PUESTO = (process.env.TABLE_FILTER_PUESTO || "").trim();
const TABLE_FILTER_ESPECIALIDAD_VALUE = (
  process.env.TABLE_FILTER_ESPECIALIDAD_VALUE || ""
).trim();
const TABLE_FILTER_ESPECIALIDAD = (
  process.env.TABLE_FILTER_ESPECIALIDAD || ""
).trim();
const TABLE_FILTER_INSTITUCION = (
  process.env.TABLE_FILTER_INSTITUCION || ""
).trim();
const TABLE_FILTER_LECCIONES = (
  process.env.TABLE_FILTER_LECCIONES || ""
).trim();
const TABLE_CELL_NAMES = (process.env.TABLE_CELL_NAMES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; WebsiteContentMonitor/1.0; +https://github.com)",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.text();
}

async function fetchPageWithBrowser(url) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: HEADLESS });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (DROPDOWN_SELECTOR) {
      const optionLabel = DROPDOWN_OPTION_LABEL;
      const optionValue = DROPDOWN_OPTION_VALUE;
      if (!optionLabel && !optionValue) {
        throw new Error(
          "Set DROPDOWN_OPTION_VALUE or DROPDOWN_OPTION_LABEL when using DROPDOWN_SELECTOR",
        );
      }

      await page.waitForSelector(DROPDOWN_SELECTOR, {
        state: "visible",
        timeout: 10000,
      });

      if (DROPDOWN_CUSTOM) {
        await page.locator(DROPDOWN_SELECTOR).click();
        await setTimeout(DROPDOWN_WAIT_AFTER_MS);
        const optionText = optionLabel || optionValue;
        const optionLocator = page
          .locator(DROPDOWN_OPTION_SELECTOR)
          .filter({ hasText: optionText.trim() })
          .first();
        await optionLocator.waitFor({ state: "visible", timeout: 10000 });
        await optionLocator.click();
      } else {
        await setTimeout(DROPDOWN_WAIT_AFTER_MS);
        const option = optionValue
          ? { value: optionValue }
          : { label: optionLabel.trim() };
        await page.selectOption(DROPDOWN_SELECTOR, option);
      }

      await setTimeout(DROPDOWN_WAIT_AFTER_MS);
      if (CONTENT_SELECTOR && CONTENT_SELECTOR !== "body") {
        await page
          .waitForSelector(CONTENT_SELECTOR, { timeout: 15000 })
          .catch(() => {});
      }
    }

    const html = await page.content();
    return html;
  } catch (error) {
    console.error("Error fetching page with browser:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

function extractContent(html, selector) {
  const $ = cheerio.load(html);
  const el = selector ? $(selector).first() : $("body").first();
  if (!el.length) {
    return $.html();
  }
  return el.html() || $.html();
}

/**
 * Keeps only table rows where the cell with data-label={dataLabel} has text equal to filterValue (trimmed).
 * Returns the filtered table HTML string.
 */
function filterTableRowsByCell(html, dataLabel, filterValue) {
  const arrayRows = [];
  if (!dataLabel || filterValue === undefined || filterValue === "") {
    return html;
  }
  const $ = cheerio.load(html);
  const value = String(filterValue).trim();
  $("tbody tr").each((_, row) => {
    const $row = $(row);
    const cell = $row.find(`td[data-label="${dataLabel}"]`).first();
    const cellText = cell.text().trim();
    if (cellText !== value) {
      $row.remove();
    } else {
      const cellValues = TABLE_CELL_NAMES.map((name) => {
        return $row.find(`td[data-label="${name}"]`).text().trim();
      });
      arrayRows.push(cellValues);
    }
  });
  // saveHtml(JSON.stringify(arrayRows, null, 2), "vacantes.json");
  // return JSON.stringify(arrayRows, null, 2);
  return arrayRows;
}

// function saveHtml(html, filename) {
//   writeFileSync(join(HTML_PATH, filename), html);
// }

async function sendNtfy(message, topic) {
  if (!topic) return;
  await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: message,
    headers: { "Content-Type": "text/plain" },
  });
}

async function sendTelegram(message, token, chatId) {
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });
}

async function notify(title, body) {
  const message = `${title}\n\n${body}`.trim();
  const ntfyTopic = process.env.NTFY_TOPIC;
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  const promises = [];
  if (ntfyTopic) {
    promises.push(sendNtfy(message, ntfyTopic));
  }
  if (telegramToken && telegramChatId) {
    promises.push(sendTelegram(message, telegramToken, telegramChatId));
  }

  await Promise.allSettled(promises);
}

async function run() {
  console.log(`[${new Date().toISOString()}] Checking ${TARGET_URL}`);

  const html = USE_PLAYWRIGHT
    ? await fetchPageWithBrowser(TARGET_URL)
    : await fetchPage(TARGET_URL);
  // saveHtml(html, "html.txt");
  let content = extractContent(html, CONTENT_SELECTOR || undefined);
  if (TABLE_FILTER_ESPECIALIDAD && TABLE_FILTER_ESPECIALIDAD_VALUE) {
    content = filterTableRowsByCell(
      content,
      TABLE_FILTER_ESPECIALIDAD,
      TABLE_FILTER_ESPECIALIDAD_VALUE,
    );
  }
  // const vacantes = JSON.parse(content);
  const lines = content.map((v) => `• ${v.join(" | ")}`);
  const body =
    content.length > 0
      ? lines.join("\n____\n")
      : "No hay vacantes disponibles con ese filtro.";

  await notify(
    `Hay ${content.length} vacantes de ${TABLE_FILTER_ESPECIALIDAD_VALUE} disponibles`,
    body,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
