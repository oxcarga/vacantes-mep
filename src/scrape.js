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

async function waitForTable(page, config) {
  const { contentSelector } = config;
  const scoped = contentSelector && contentSelector !== "body";
  if (scoped) {
    await page.waitForSelector(contentSelector, { timeout: 15000 });
  }
  const rowSelector = scoped ? `${contentSelector} tbody tr` : "tbody tr";
  try {
    await page.waitForSelector(rowSelector, { timeout: 15000 });
  } catch {
    console.warn(
      "No aparecieron filas en la tabla; se continúa con el HTML actual.",
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
  await waitForTable(page, config);
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
      await waitForTable(page, config);
    }

    return await collectPages(page, config.maxPages);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/** Returns every HTML page that may contain vacancy rows. */
export async function fetchVacancyPages(config) {
  if (config.usePlaywright) {
    return fetchPagesWithBrowser(config.targetUrl, config);
  }
  return [await fetchPage(config.targetUrl)];
}
