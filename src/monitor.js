#!/usr/bin/env node
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { setTimeout } from "node:timers/promises";
import dotenv from "dotenv";
import {
  buildDiffMessage,
  createDbClient,
  ensureSchema,
  formatOpeningLine,
  persistAndDiff,
  recordFailedRun,
  withIds,
} from "./db.js";
import { extractHtml, parseVacancyRows } from "./parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const TARGET_URL = (process.env.TARGET_URL || "https://example.com").trim();
const CONTENT_SELECTOR = process.env.CONTENT_SELECTOR || "body";

const USE_PLAYWRIGHT =
  process.env.USE_PLAYWRIGHT === "1" || process.env.USE_PLAYWRIGHT === "true";
const HEADLESS =
  process.env.HEADLESS !== "0" && process.env.HEADLESS !== "false";
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

const TABLE_FILTER_ESPECIALIDAD_VALUE = (
  process.env.TABLE_FILTER_ESPECIALIDAD_VALUE || ""
).trim();
const TABLE_CELL_NAMES = (process.env.TABLE_CELL_NAMES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DATABASE_URL = (process.env.DATABASE_URL || "").trim();
const DATABASE_AUTH_TOKEN = (process.env.DATABASE_AUTH_TOKEN || "").trim();
const REGIONAL = DROPDOWN_OPTION_LABEL || DROPDOWN_OPTION_VALUE || "";

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
    const launchArgs = (process.env.PLAYWRIGHT_LAUNCH_ARGS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const browser = await chromium.launch({
      headless: HEADLESS,
      args: launchArgs.length > 0 ? launchArgs : undefined,
    });
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

    return await page.content();
  } catch (error) {
    console.error("Error fetching page with browser:", error);
    if (error.message.includes("attempting select option action")) {
      return `[ERROR] No existe la opción "${DROPDOWN_OPTION_LABEL} : ${DROPDOWN_OPTION_VALUE}" en el dropdown.`;
    }
    return `[ERROR] ${error.message}`;
  } finally {
    await browser.close();
  }
}

async function sendNtfy(message, topic) {
  if (!topic) return;
  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: message,
    headers: { "Content-Type": "text/plain" },
  });
  if (!res.ok) {
    console.error(`ntfy.sh failed: HTTP ${res.status}`);
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
    console.error(`Telegram failed: HTTP ${res.status}`);
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

  await Promise.allSettled(promises);
}

function formatFullList(openings) {
  if (openings.length === 0) {
    return "No hay vacantes disponibles con ese filtro.";
  }
  return openings.map(formatOpeningLine).join("\n____\n");
}

async function run() {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Checking ${TARGET_URL}`);

  const client = createDbClient(DATABASE_URL, DATABASE_AUTH_TOKEN);
  if (client) {
    await ensureSchema(client);
    console.log(`Using database ${DATABASE_URL.replace(/:[^@/]+@/, ":")}`);
  } else {
    console.log("DATABASE_URL not set; notifying on every run (no scrape cache)");
  }

  try {
    const html = USE_PLAYWRIGHT
      ? await fetchPageWithBrowser(TARGET_URL)
      : await fetchPage(TARGET_URL);

    if (typeof html === "string" && html.includes("[ERROR]")) {
      if (client) {
        await recordFailedRun(client, { startedAt, error: html });
      }
      return await notify(html, "");
    }

    const tableHtml = extractHtml(html, CONTENT_SELECTOR || undefined);
    const openings = withIds(
      parseVacancyRows(tableHtml, {
        especialidadFilter: TABLE_FILTER_ESPECIALIDAD_VALUE || undefined,
        cellNames: TABLE_CELL_NAMES,
      }),
      REGIONAL,
    );

    console.log(`Parsed ${openings.length} openings`);

    if (!client) {
      await notify(
        `Hay ${openings.length} vacantes de ${TABLE_FILTER_ESPECIALIDAD_VALUE} disponibles en la ${REGIONAL}`,
        formatFullList(openings),
      );
      return;
    }

    const diff = await persistAndDiff(client, openings, {
      regional: REGIONAL,
      startedAt,
    });
    const hasChanges =
      diff.added.length > 0 ||
      diff.removed.length > 0 ||
      diff.changed.length > 0;

    if (!hasChanges) {
      if (diff.isFirstRun) {
        await notify(
          `Hay ${openings.length} vacantes de ${TABLE_FILTER_ESPECIALIDAD_VALUE} disponibles en la ${REGIONAL}`,
          formatFullList(openings),
        );
      } else {
        console.log(
          `No changes (${openings.length} openings, hash ${diff.contentHash.slice(0, 8)})`,
        );
      }
      return;
    }

    const { title, body } = buildDiffMessage({
      specialty: TABLE_FILTER_ESPECIALIDAD_VALUE || "todas",
      regional: REGIONAL || TARGET_URL,
      added: diff.added,
      removed: diff.removed,
      changed: diff.changed,
      total: openings.length,
    });
    await notify(title, body);
  } finally {
    if (client && typeof client.close === "function") {
      client.close();
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
