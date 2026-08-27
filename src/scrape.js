import { setTimeout as delay } from "node:timers/promises";

const USER_AGENT =
  "Mozilla/5.0 (compatible; VacantesMEP/1.0; +https://github.com/oxcarga/vacantes-mep)";

const NEXT_PAGE_LABEL = /next page|página siguiente|siguiente/i;

export function findDropdownOption(available, { value = "", label = "" } = {}) {
  const wantedValue = String(value || "").trim();
  const wantedLabel = String(label || "").trim().toLowerCase();
  const options = available ?? [];

  return (
    options.find((option) => wantedValue && option.value === wantedValue) ??
    options.find(
      (option) =>
        wantedLabel &&
        String(option.label || "").trim().toLowerCase() === wantedLabel,
    ) ??
    options.find(
      (option) =>
        wantedLabel &&
        String(option.label || "").toLowerCase().includes(wantedLabel),
    )
  );
}

export function formatMissingDropdownOption({ value, label }, available) {
  const list =
    available?.length > 0
      ? available.map((option) => `${option.value}: ${option.label}`).join("; ")
      : "(ninguna)";
  return `No existe la opción "${label || ""}" (value ${value || ""}) en el dropdown. Opciones disponibles: ${list}`;
}

export async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.text();
}

/** Text of the row a table shows in place of results, if any. */
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

async function listNativeOptions(page, selector) {
  return page.$$eval(`${selector} option`, (options) =>
    options
      .map((option) => ({
        value: option.value.trim(),
        label: option.textContent.trim(),
      }))
      .filter((option) => option.value),
  );
}

/**
 * The MEP form renders a native <select> even though the rest of the page is
 * MudBlazor, so the element tag decides how to pick the option rather than
 * DROPDOWN_CUSTOM alone.
 */
async function selectRegional(page, config) {
  const {
    dropdownSelector,
    dropdownOptionLabel,
    dropdownOptionValue,
    dropdownCustom,
    dropdownOptionSelector,
    dropdownWaitAfterMs,
  } = config;

  if (!dropdownOptionLabel && !dropdownOptionValue) {
    throw new Error(
      "Configure DROPDOWN_OPTION_VALUE o DROPDOWN_OPTION_LABEL para usar DROPDOWN_SELECTOR",
    );
  }

  await page.waitForSelector(dropdownSelector, {
    state: "visible",
    timeout: 15000,
  });

  // Remembered so the wait below can tell "the table never reacted" apart from
  // "the table reacted and this regional has no vacancies".
  await waitForTableContainer(page, config.contentSelector);
  const placeholderBefore = await page.evaluate(
    readPlaceholder,
    config.contentSelector,
  );

  const tagName = await page
    .locator(dropdownSelector)
    .evaluate((element) => element.tagName);

  if (dropdownCustom && tagName !== "SELECT") {
    await page.locator(dropdownSelector).click();
    await delay(dropdownWaitAfterMs);
    const optionText = (dropdownOptionLabel || dropdownOptionValue).trim();
    const option = page
      .locator(dropdownOptionSelector)
      .filter({ hasText: optionText })
      .first();
    try {
      await option.waitFor({ state: "visible", timeout: 10000 });
    } catch {
      throw new Error(
        formatMissingDropdownOption(
          { value: dropdownOptionValue, label: dropdownOptionLabel },
          [],
        ),
      );
    }
    await option.click();
  } else {
    await page
      .waitForFunction(
        (selector) =>
          (document.querySelector(selector)?.options?.length ?? 0) > 1,
        dropdownSelector,
        { timeout: 15000 },
      )
      .catch(() => {});
    const available = await listNativeOptions(page, dropdownSelector);
    const match = findDropdownOption(available, {
      value: dropdownOptionValue,
      label: dropdownOptionLabel,
    });
    if (!match) {
      throw new Error(
        formatMissingDropdownOption(
          { value: dropdownOptionValue, label: dropdownOptionLabel },
          available,
        ),
      );
    }
    await page.selectOption(dropdownSelector, { value: match.value });
  }

  await delay(dropdownWaitAfterMs);
  await waitForVacancyRows(page, config, placeholderBefore);
}

/**
 * The results table is paginated, so a single page.content() would only ever
 * see the first page of vacancies. Walk the pager and collect every page.
 */
async function collectPages(page, maxPages) {
  const pages = [await page.content()];
  const next = page.getByRole("button", { name: NEXT_PAGE_LABEL });

  for (let visited = 1; visited < maxPages; visited += 1) {
    if ((await next.count()) === 0 || (await next.first().isDisabled())) break;

    const firstCellBefore = (
      await page
        .locator("tbody tr td")
        .first()
        .textContent()
        .catch(() => "")
    )?.trim();

    await next.first().click();
    await page
      .waitForFunction(
        (previous) =>
          document.querySelector("tbody tr td")?.textContent?.trim() !==
          previous,
        firstCellBefore,
        { timeout: 10000 },
      )
      .catch(() => {});
    await delay(400);
    pages.push(await page.content());
  }

  return pages;
}

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

    if (config.dropdownSelector) {
      await selectRegional(page, config);
    } else {
      await waitForVacancyRows(page, config);
    }

    return await collectPages(page, config.maxPages);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Returns every HTML page that may contain vacancy rows.
 *
 * The MEP site is often slow enough to time out. Retrying beats notifying on a
 * hiccup, since a failed run means no vacancy check for another hour.
 */
export async function fetchVacancyPages(config) {
  const attempts = config.scrapeAttempts;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return config.usePlaywright
        ? await fetchPagesWithBrowser(config.targetUrl, config)
        : [await fetchPage(config.targetUrl)];
    } catch (error) {
      if (attempt >= attempts) throw error;
      const backoff = config.scrapeRetryDelayMs * attempt;
      console.warn(
        `Intento ${attempt} de ${attempts} falló (${error.message}). Reintentando en ${backoff} ms.`,
      );
      await delay(backoff);
    }
  }
}
