#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { setTimeout } from "node:timers/promises";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import {
  buildNotification,
  diffVacancies,
  filterVacancies,
  parseCellNames,
  parseVacancies,
  specialtyLabel,
  splitFilterValues,
  truncateUtf8,
  uniqueVacancies,
} from "./vacancies.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env"), quiet: true });

const TARGET_URL = (process.env.TARGET_URL || "https://example.com").trim();
const CONTENT_SELECTOR = (process.env.CONTENT_SELECTOR || "body").trim();
const BASELINE_PATH = (
  process.env.BASELINE_PATH || join(process.cwd(), "data", "baseline.json")
).trim();

const USE_PLAYWRIGHT =
  process.env.USE_PLAYWRIGHT === "1" || process.env.USE_PLAYWRIGHT === "true";
const HEADLESS =
  process.env.HEADLESS !== "0" && process.env.HEADLESS !== "false";
const DROPDOWN_SELECTOR = (process.env.DROPDOWN_SELECTOR || "").trim();
const DROPDOWN_OPTION_VALUE = (process.env.DROPDOWN_OPTION_VALUE || "").trim();
const DROPDOWN_OPTION_LABEL = (process.env.DROPDOWN_OPTION_LABEL || "").trim();
const DROPDOWN_WAIT_AFTER_MS = Number(process.env.DROPDOWN_WAIT_AFTER_MS || "2000");
const DROPDOWN_CUSTOM =
  process.env.DROPDOWN_CUSTOM === "1" || process.env.DROPDOWN_CUSTOM === "true";
const DROPDOWN_OPTION_SELECTOR =
  (process.env.DROPDOWN_OPTION_SELECTOR || "").trim() ||
  ".mud-list-item, [role='option'], .mud-select-item";

const TABLE_CELL_NAMES = parseCellNames(process.env.TABLE_CELL_NAMES);
const TABLE_FILTER_ESPECIALIDAD = (
  process.env.TABLE_FILTER_ESPECIALIDAD || "Especialidad"
).trim();
const TABLE_FILTER_PUESTO = (process.env.TABLE_FILTER_PUESTO || "").trim();
const TABLE_FILTER_INSTITUCION = (
  process.env.TABLE_FILTER_INSTITUCION || ""
).trim();
const TABLE_FILTER_LECCIONES = (process.env.TABLE_FILTER_LECCIONES || "").trim();

const COLUMN_FILTERS = [
  {
    column: TABLE_FILTER_ESPECIALIDAD,
    values: splitFilterValues(process.env.TABLE_FILTER_ESPECIALIDAD_VALUE),
  },
  {
    column: TABLE_FILTER_PUESTO,
    values: splitFilterValues(process.env.TABLE_FILTER_PUESTO_VALUE),
  },
  {
    column: TABLE_FILTER_INSTITUCION,
    values: splitFilterValues(process.env.TABLE_FILTER_INSTITUCION_VALUE),
  },
  {
    column: TABLE_FILTER_LECCIONES,
    values: splitFilterValues(process.env.TABLE_FILTER_LECCIONES_VALUE),
  },
];

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; VacantesMEP/1.0; +https://github.com/oxcarga/vacantes-mep)",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.text();
}

async function fetchPageWithBrowser(url) {
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
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

      const isNativeSelect = await page
        .locator(DROPDOWN_SELECTOR)
        .evaluate((el) => el.tagName === "SELECT");

      if (DROPDOWN_CUSTOM && !isNativeSelect) {
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
        await page
          .waitForFunction(
            (sel) => (document.querySelector(sel)?.options?.length ?? 0) > 1,
            DROPDOWN_SELECTOR,
            { timeout: 10000 },
          )
          .catch(() => {});
        const available = await page.$$eval(`${DROPDOWN_SELECTOR} option`, (els) =>
          els.map((el) => ({
            value: el.value,
            label: el.textContent.trim(),
          })),
        );
        const match = optionValue
          ? available.find((opt) => opt.value === optionValue)
          : available.find(
              (opt) =>
                opt.label === optionLabel.trim() ||
                opt.label.includes(optionLabel.trim()),
            );
        if (!match) {
          throw new Error(
            `attempting select option action: missing ${optionLabel} : ${optionValue}`,
          );
        }
        await page.selectOption(DROPDOWN_SELECTOR, { value: match.value });
      }

      await setTimeout(DROPDOWN_WAIT_AFTER_MS);
      const tableWaitSelector =
        CONTENT_SELECTOR && CONTENT_SELECTOR !== "body"
          ? `${CONTENT_SELECTOR} tbody tr, ${CONTENT_SELECTOR} tr, tbody tr`
          : "tbody tr";
      await page.waitForSelector(tableWaitSelector, { timeout: 15000 }).catch(() => {});
    }

    return await collectPaginatedHtml(page);
  } catch (error) {
    console.error("Error fetching page with browser:", error);
    if (error.message.includes("attempting select option action")) {
      return `[ERROR] No existe la opción "${DROPDOWN_OPTION_LABEL} : ${DROPDOWN_OPTION_VALUE}" en el dropdown.`;
    }
    return `[ERROR] ${error.message}`;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function collectPaginatedHtml(page) {
  const htmls = [await page.content()];
  const next = page.getByRole("button", { name: "Next page" });
  for (let i = 0; i < 29; i += 1) {
    if (!(await next.count()) || (await next.isDisabled())) break;
    const previousFirst = (
      await page.locator("tbody tr td").first().textContent().catch(() => "")
    )?.trim();
    await next.click();
    await page
      .waitForFunction(
        (prev) =>
          document.querySelector("tbody tr td")?.textContent?.trim() !== prev,
        previousFirst,
        { timeout: 10000 },
      )
      .catch(() => {});
    await setTimeout(400);
    htmls.push(await page.content());
  }
  return htmls;
}

function extractContent(html, selector) {
  const $ = cheerio.load(html);
  const el = selector ? $(selector).first() : $("body").first();
  if (!el.length) {
    return $.html();
  }
  return el.html() || $.html();
}

export function loadBaseline(path = BASELINE_PATH) {
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(data?.vacancies)) return null;
    return data;
  } catch (error) {
    console.warn(`Could not read baseline at ${path}:`, error.message);
    return null;
  }
}

export function saveBaseline(vacancies, path = BASELINE_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        vacancies,
      },
      null,
      2,
    ),
  );
}

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

export async function notify(title, body) {
  const message = truncateUtf8(`${title}\n\n${body}`.trim());
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

  if (promises.length === 0) {
    console.log(message);
    return;
  }

  await Promise.allSettled(promises);
}

export async function run() {
  console.log(`[${new Date().toISOString()}] Checking ${TARGET_URL}`);

  const fetched = USE_PLAYWRIGHT
    ? await fetchPageWithBrowser(TARGET_URL)
    : [await fetchPage(TARGET_URL)];

  if (typeof fetched === "string" && fetched.startsWith("[ERROR]")) {
    await notify(fetched, "");
    return;
  }

  const htmls = Array.isArray(fetched) ? fetched : [fetched];
  const parsed = uniqueVacancies(
    htmls.flatMap((html) =>
      parseVacancies(
        extractContent(html, CONTENT_SELECTOR || undefined),
        TABLE_CELL_NAMES,
      ),
    ),
    TABLE_CELL_NAMES,
  );
  const baseline = loadBaseline();

  if (parsed.length === 0 && baseline?.vacancies?.length) {
    await notify(
      "[ERROR] No se encontraron filas en la tabla de vacantes.",
      "No se actualizó la línea base para no perder las vacantes anteriores.",
    );
    return;
  }

  const current = filterVacancies(parsed, COLUMN_FILTERS);
  const specialty = specialtyLabel(
    splitFilterValues(process.env.TABLE_FILTER_ESPECIALIDAD_VALUE),
  );
  const regionalLabel = DROPDOWN_OPTION_LABEL || "la regional";

  if (!baseline) {
    const notification = buildNotification({
      firstRun: true,
      current,
      specialtyLabel: specialty,
      regionalLabel,
      cellNames: TABLE_CELL_NAMES,
    });
    await notify(notification.title, notification.body);
    saveBaseline(current);
    console.log(`Baseline saved with ${current.length} vacancies (first run).`);
    return;
  }

  const { added, removed, unchanged } = diffVacancies(
    baseline.vacancies,
    current,
    TABLE_CELL_NAMES,
  );
  const notification = buildNotification({
    current,
    added,
    removed,
    specialtyLabel: specialty,
    regionalLabel,
    cellNames: TABLE_CELL_NAMES,
  });

  if (notification) {
    await notify(notification.title, notification.body);
  } else {
    console.log("No vacancy changes since last run.");
  }

  saveBaseline(current);
  console.log(
    `Baseline updated: ${current.length} current, ${added.length} added, ${removed.length} removed, unchanged=${unchanged}`,
  );
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
