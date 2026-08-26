#!/usr/bin/env node
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import dotenv from "dotenv";
import {
  buildNotification,
  DEFAULT_CELL_NAMES,
  diffVacancies,
  findDropdownOption,
  formatMissingDropdownOption,
  loadBaseline,
  parseVacancies,
  saveBaseline,
} from "./vacancies.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

function envFlag(value, defaultValue) {
  if (value === undefined || String(value).trim() === "") {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return defaultValue;
}

function envText(value, fallback = "") {
  const text = (value ?? fallback).toString().trim();
  return text || fallback;
}

const TARGET_URL = envText(
  process.env.TARGET_URL,
  "https://apps.mep.go.cr/formulario",
);
const CONTENT_SELECTOR = envText(
  process.env.CONTENT_SELECTOR,
  ".mud-table-container",
);
const USE_PLAYWRIGHT = envFlag(process.env.USE_PLAYWRIGHT, true);
const HEADLESS = envFlag(process.env.HEADLESS, true);
const DROPDOWN_SELECTOR = envText(process.env.DROPDOWN_SELECTOR, "#regionalSelect");
const DROPDOWN_OPTION_VALUE = envText(process.env.DROPDOWN_OPTION_VALUE, "53");
const DROPDOWN_OPTION_LABEL = envText(
  process.env.DROPDOWN_OPTION_LABEL,
  "Regional Educación Perez Zeledon",
);
const DROPDOWN_WAIT_AFTER_MS = (() => {
  const parsed = Number.parseInt(process.env.DROPDOWN_WAIT_AFTER_MS || "2000", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2000;
})();
const DROPDOWN_CUSTOM = envFlag(process.env.DROPDOWN_CUSTOM, true);
const DROPDOWN_OPTION_SELECTOR =
  envText(process.env.DROPDOWN_OPTION_SELECTOR) ||
  ".mud-list-item, [role='option'], .mud-select-item";
const TABLE_FILTER_ESPECIALIDAD = envText(
  process.env.TABLE_FILTER_ESPECIALIDAD,
  "Especialidad",
);
const TABLE_FILTER_ESPECIALIDAD_VALUE = envText(
  process.env.TABLE_FILTER_ESPECIALIDAD_VALUE,
  "Español",
);
const TABLE_CELL_NAMES = envText(
  process.env.TABLE_CELL_NAMES,
  DEFAULT_CELL_NAMES.join(","),
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const BASELINE_PATH = resolve(
  process.cwd(),
  envText(process.env.BASELINE_PATH, "data/baseline.json"),
);

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

async function waitForTable(page) {
  if (CONTENT_SELECTOR && CONTENT_SELECTOR !== "body") {
    await page.waitForSelector(CONTENT_SELECTOR, { timeout: 15000 });
  }
  const rowSelector =
    CONTENT_SELECTOR && CONTENT_SELECTOR !== "body"
      ? `${CONTENT_SELECTOR} tbody tr`
      : "tbody tr";
  try {
    await page.waitForSelector(rowSelector, { timeout: 15000 });
  } catch {
    console.warn(
      "No aparecieron filas en la tabla después de esperar; se continúa con el HTML actual.",
    );
  }
}

function missingDropdownOptionError(available) {
  return new Error(
    formatMissingDropdownOption(
      { value: DROPDOWN_OPTION_VALUE, label: DROPDOWN_OPTION_LABEL },
      available,
    ),
  );
}

async function listNativeOptions(page) {
  return page.$$eval(`${DROPDOWN_SELECTOR} option`, (opts) =>
    opts
      .map((opt) => ({
        value: opt.value.trim(),
        label: opt.textContent.trim(),
      }))
      .filter((opt) => opt.value),
  );
}

function matchDropdownOption(available) {
  return findDropdownOption(available, {
    value: DROPDOWN_OPTION_VALUE,
    label: DROPDOWN_OPTION_LABEL,
  });
}

async function selectRegional(page) {
  if (!DROPDOWN_OPTION_LABEL && !DROPDOWN_OPTION_VALUE) {
    throw new Error(
      "Set DROPDOWN_OPTION_VALUE or DROPDOWN_OPTION_LABEL when using DROPDOWN_SELECTOR",
    );
  }

  await page.waitForSelector(DROPDOWN_SELECTOR, {
    state: "visible",
    timeout: 15000,
  });

  const tagName = await page
    .locator(DROPDOWN_SELECTOR)
    .evaluate((el) => el.tagName);
  // Native <select> must use selectOption even if DROPDOWN_CUSTOM=1 (MEP form).
  const useCustom = DROPDOWN_CUSTOM && tagName !== "SELECT";

  if (useCustom) {
    await page.locator(DROPDOWN_SELECTOR).click();
    await setTimeout(DROPDOWN_WAIT_AFTER_MS);
    const optionText = DROPDOWN_OPTION_LABEL || DROPDOWN_OPTION_VALUE;
    const optionLocator = page
      .locator(DROPDOWN_OPTION_SELECTOR)
      .filter({ hasText: optionText.trim() })
      .first();
    try {
      await optionLocator.waitFor({ state: "visible", timeout: 10000 });
    } catch {
      throw missingDropdownOptionError([]);
    }
    await optionLocator.click();
  } else {
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return Boolean(el && el.options && el.options.length > 1);
      },
      DROPDOWN_SELECTOR,
      { timeout: 15000 },
    );
    const available = await listNativeOptions(page);
    const match = matchDropdownOption(available);
    if (!match) {
      throw missingDropdownOptionError(available);
    }
    await page.selectOption(DROPDOWN_SELECTOR, { value: match.value });
  }

  await setTimeout(DROPDOWN_WAIT_AFTER_MS);
  await waitForTable(page);
}

async function fetchPageWithBrowser(url) {
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (DROPDOWN_SELECTOR) {
      await selectRegional(page);
    } else if (CONTENT_SELECTOR && CONTENT_SELECTOR !== "body") {
      await waitForTable(page);
    }

    return await page.content();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function sendNtfy(message, topic) {
  if (!topic) return;
  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: message,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
  if (!res.ok) {
    throw new Error(`ntfy.sh HTTP ${res.status}: ${res.statusText}`);
  }
}

async function sendTelegram(message, token, chatId) {
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram HTTP ${res.status}: ${res.statusText}`);
  }
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
  if (promises.length === 0) {
    console.log("No notification channel configured; message was:\n", message);
    return;
  }

  const results = await Promise.allSettled(promises);
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    for (const result of failed) {
      console.error("Notification failed:", result.reason);
    }
    throw failed[0].reason;
  }
}

async function run() {
  console.log(`[${new Date().toISOString()}] Checking ${TARGET_URL}`);

  try {
    const html = USE_PLAYWRIGHT
      ? await fetchPageWithBrowser(TARGET_URL)
      : await fetchPage(TARGET_URL);

    const vacancies = parseVacancies(html, {
      contentSelector: CONTENT_SELECTOR,
      cellNames: TABLE_CELL_NAMES,
      filterLabel: TABLE_FILTER_ESPECIALIDAD,
      filterValue: TABLE_FILTER_ESPECIALIDAD_VALUE,
    });

    const baseline = loadBaseline(BASELINE_PATH);
    const previous = baseline?.vacancies ?? null;
    const isFirstRun = previous === null;
    const { added, removed } = isFirstRun
      ? { added: vacancies, removed: [] }
      : diffVacancies(previous, vacancies, TABLE_CELL_NAMES);

    console.log(
      `Found ${vacancies.length} matching vacancies (${added.length} new, ${removed.length} gone).`,
    );

    const notification = buildNotification({
      current: vacancies,
      added,
      removed,
      isFirstRun,
      especialidad: TABLE_FILTER_ESPECIALIDAD_VALUE,
      regional: DROPDOWN_OPTION_LABEL,
      cellNames: TABLE_CELL_NAMES,
    });

    if (notification.shouldNotify) {
      await notify(notification.title, notification.body);
    } else {
      console.log("No vacancy changes since last run.");
    }

    saveBaseline(BASELINE_PATH, vacancies);
    console.log(`Baseline saved to ${BASELINE_PATH}`);
  } catch (error) {
    console.error(error);
    try {
      await notify(
        "Error al consultar vacantes MEP",
        error.message || String(error),
      );
    } catch (notifyError) {
      console.error("Failed to send error notification:", notifyError);
    }
    process.exitCode = 1;
  }
}

run();
