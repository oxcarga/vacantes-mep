import { setTimeout as delay } from "node:timers/promises";
import { ConfigurationError } from "./errors.js";
import { collectPages } from "./pagination.js";

/**
 * Reads the placeholder text shown by the table when no results are available.
 * Runs inside the browser context via `page.evaluate`.
 * @param {string} selector - The content container selector, or `"body"` for the full page.
 * @returns {string | null} Placeholder text, or `null` if none is visible.
 */
function readPlaceholder(selector) {
  const scope =
    selector && selector !== "body"
      ? document.querySelector(selector)
      : document.body;
  return (
    scope
      ?.querySelector("tbody .mud-table-empty-row, tbody tr th[colspan]")
      ?.textContent?.trim() ?? null
  );
}

/**
 * Waits for the table wrapper element to appear in the DOM before any vacancy rows are checked.
 * @param {import('playwright').Page} page
 * @param {string} contentSelector - CSS selector for the table container, e.g. `.mud-table-container`.
 * @returns {Promise<void>}
 */
async function waitForTableContainer(page, contentSelector) {
  if (contentSelector && contentSelector !== "body") {
    await page.waitForSelector(contentSelector, { timeout: 15000 });
  }
}

/**
 * Waits for the table to answer the regional that was just picked. Waiting for
 * "tbody tr" is not enough: an empty MudBlazor table still renders one row, so
 * the placeholder asking you to choose a regional matches straight away and the
 * page would be captured before its data arrives — reporting no vacancies and,
 * worse, every previously seen vacancy as closed. Only cells count as data.
 * @param {import('playwright').Page} page
 * @param {Object} config - App config from `loadConfig`.
 * @param {string | null} [placeholderBefore=null] - Placeholder text visible before selecting the regional,
 *   used to detect when the table failed to react at all.
 * @returns {Promise<void>}
 */
async function waitForVacancyRows(page, config, placeholderBefore = null) {
  const { contentSelector } = config;
  await waitForTableContainer(page, contentSelector);

  const scope =
    contentSelector && contentSelector !== "body" ? `${contentSelector} ` : "";
  try {
    await page.waitForSelector(`${scope}tbody tr td[data-label]`, {
      timeout: 15000,
    });
  } catch {
    const placeholder = await page.evaluate(readPlaceholder, contentSelector);
    if (placeholder && placeholder === placeholderBefore) {
      throw new Error(
        `La tabla no reaccionó al escoger la regional y sigue mostrando "${placeholder}". Suba DROPDOWN_WAIT_AFTER_MS si la página tarda en conectarse.`,
      );
    }
    console.warn(
      `La tabla no muestra vacantes${placeholder ? `: "${placeholder}"` : ""}.`,
    );
  }
}

/**
 * Waits until a native `<select>` has more than the placeholder option.
 * @param {import('playwright').Page} page
 * @param {string} selector - CSS selector targeting the `<select>` element.
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<void>}
 */
export async function waitForNativeOptions(
  page,
  selector,
  { timeout = 15000 } = {},
) {
  await page.waitForFunction(
    (sel) => (document.querySelector(sel)?.options?.length ?? 0) > 1,
    selector,
    { timeout },
  );
}

/**
 * Returns all `{ value, label }` pairs from a native `<select>` element, filtering out blank values.
 * @param {import('playwright').Page} page
 * @param {string} selector - CSS selector targeting the `<select>` element.
 * @returns {Promise<{ value: string, label: string }[]>}
 */
export async function listNativeOptions(page, selector) {
  return page.$$eval(`${selector} option`, (options) =>
    options
      .map((option) => ({
        value: option.value.trim(),
        label: option.textContent.trim(),
      }))
      .filter((option) => option.value),
  );
}

function firstDataCellSelector(contentSelector) {
  const scope =
    contentSelector && contentSelector !== "body" ? `${contentSelector} ` : "";
  return `${scope}tbody tr td[data-label]`;
}

/**
 * Selects a regional by value, waits for the table to react, and returns every
 * paginated page.
 * @param {import('playwright').Page} page
 * @param {Object} config
 * @param {{ value: string, label?: string }} regional
 * @returns {Promise<string[]>}
 */
export async function scrapeRegional(page, config, regional) {
  const { dropdownSelector, contentSelector, dropdownWaitAfterMs } = config;
  const firstCellSelector = firstDataCellSelector(contentSelector);

  const before = await page
    .locator(firstCellSelector)
    .first()
    .textContent()
    .catch(() => null);

  await page.selectOption(dropdownSelector, { value: regional.value });

  await delay(500);
  await page
    .waitForFunction(
      ({ selector, snapshot }) => {
        const text = document.querySelector(selector)?.textContent?.trim();
        return text !== undefined && text !== snapshot;
      },
      { selector: firstCellSelector, snapshot: before },
      { timeout: dropdownWaitAfterMs },
    )
    .catch(() => {});

  try {
    await page.waitForSelector(firstCellSelector, { timeout: 3000 });
  } catch {
    // This regional has no vacancies.
  }

  return collectPages(page, config);
}

/**
 * Launches a Chromium browser, navigates to `url`, and collects vacancy pages.
 * Every regional in the native `<select>` is scraped in one session. Closes
 * the browser on exit.
 * @param {string} url - The MEP form URL to open.
 * @param {Object} config - App config from `loadConfig`.
 * @returns {Promise<{ groups: { pages: string[], regionalLabel: string, regionalValue: string, scrapedAt: string }[] }>}
 */
export async function fetchPagesWithBrowser(url, config) {
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({
      headless: config.headless,
      args: config.launchArgs.length > 0 ? config.launchArgs : undefined,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (!config.dropdownSelector) {
      await waitForVacancyRows(page, config);
      const scrapedAt = new Date().toISOString();
      return {
        groups: [
          {
            pages: await collectPages(page, config),
            regionalLabel: "",
            regionalValue: "",
            scrapedAt,
          },
        ],
      };
    }

    await page.waitForSelector(config.dropdownSelector, {
      state: "visible",
      timeout: 15000,
    });

    await waitForNativeOptions(page, config.dropdownSelector, {
      timeout: 20000,
    });
    const tagName = await page
      .locator(config.dropdownSelector)
      .evaluate((element) => element.tagName);
    if (tagName !== "SELECT") {
      throw new ConfigurationError(
        "Recorrer todas las regionales requiere un <select> nativo.",
      );
    }

    const regionales = await listNativeOptions(page, config.dropdownSelector);
    if (regionales.length === 0) {
      throw new ConfigurationError(
        "El dropdown de regionales no ofreció opciones.",
      );
    }

    console.log(`Procesando ${regionales.length} regionales…`);
    const groups = [];
    for (const [idx, regional] of regionales.entries()) {
      const scrapedAt = new Date().toISOString();
      console.log(
        `[${idx + 1}/${regionales.length}] ${regional.label} (value=${regional.value}) …`,
      );
      const pages = await scrapeRegional(page, config, regional);
      groups.push({
        pages,
        regionalLabel: regional.label,
        regionalValue: regional.value,
        scrapedAt,
      });
      console.log(`         ${pages.length} página(s).`);
    }
    return { groups };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
