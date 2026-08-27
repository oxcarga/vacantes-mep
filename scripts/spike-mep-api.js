#!/usr/bin/env node
/**
 * Spike: can the MEP vacancy form be fetched as JSON without Playwright?
 *
 * The form is a MudBlazor/Blazor app at https://apps.mep.go.cr/formulario.
 * If it talks to a public REST/XHR API, we could drop Chromium and run on
 * cheap serverless. If it only hydrates over Blazor/SignalR, Playwright stays.
 *
 * Usage: npm run spike:mep
 * Optional: USE_PLAYWRIGHT=1 npm run spike:mep  (intercepts browser traffic)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TARGET = process.env.TARGET_URL || "https://apps.mep.go.cr/formulario";
const OUT_DIR = join(process.cwd(), "data", "spike");
const UA =
  "Mozilla/5.0 (compatible; VacantesMEP/1.0; +https://github.com/oxcarga/vacantes-mep)";

const clues = {
  blazorServer: /blazor\.server\.js|_blazor|Blazor\.start/i,
  blazorWebAssembly: /blazor\.webassembly\.js|_framework\/dotnet/i,
  signalR: /signalr|negotiate\?|Microsoft\.AspNetCore\.Http\.Connections/i,
  mudBlazor: /mudblazor|mud-table|mud-select/i,
  jsonApi: /\/api\/|application\/json/i,
};

function summarizeHtml(html) {
  const hits = {};
  for (const [name, re] of Object.entries(clues)) {
    hits[name] = re.test(html);
  }
  const scriptSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map(
    (m) => m[1],
  );
  const apiishHrefs = [
    ...html.matchAll(/https?:\/\/[^"' \s]+/gi),
  ]
    .map((m) => m[0])
    .filter((u) => /api|blazor|hub|signalr|vacante/i.test(u))
    .slice(0, 40);
  return { hits, scriptSrcs: scriptSrcs.slice(0, 40), apiishHrefs };
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/json" },
    redirect: "follow",
  });
  const body = await res.text();
  return {
    url: res.url,
    status: res.status,
    contentType: res.headers.get("content-type"),
    body,
  };
}

function printReport(title, data) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
}

async function probeCommonApiPaths(origin) {
  const paths = [
    "/api/vacantes",
    "/api/Vacantes",
    "/api/formulario",
    "/formulario/api",
    "/formulario/_blazor",
    "/formulario/_blazor/negotiate",
    "/_blazor/negotiate",
    "/_blazor",
    "/swagger/index.html",
    "/swagger/v1/swagger.json",
  ];
  const results = [];
  for (const path of paths) {
    try {
      const res = await fetch(origin + path, {
        headers: { "User-Agent": UA, Accept: "application/json,text/html" },
        redirect: "follow",
      });
      results.push({
        path,
        status: res.status,
        contentType: res.headers.get("content-type"),
        finalUrl: res.url,
      });
    } catch (err) {
      results.push({ path, error: err.message });
    }
  }
  return results;
}

async function interceptWithPlaywright(url) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const requests = [];
  try {
    const page = await browser.newPage();
    page.on("request", (req) => {
      const rt = req.resourceType();
      if (rt === "xhr" || rt === "fetch" || rt === "websocket") {
        requests.push({
          type: rt,
          method: req.method(),
          url: req.url(),
        });
      }
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(5000);
    return requests;
  } finally {
    await browser.close();
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const page = await fetchText(TARGET);
  writeFileSync(join(OUT_DIR, "formulario.html"), page.body);
  const origin = new URL(page.url).origin;
  const summary = {
    fetched: {
      status: page.status,
      contentType: page.contentType,
      finalUrl: page.url,
      bytes: page.body.length,
    },
    html: summarizeHtml(page.body),
  };

  const hasVacancyTable =
    /data-label="Vacante"|mud-table/i.test(page.body) &&
    /tbody/i.test(page.body);
  summary.html.vacancyTablePresentInStaticHtml = hasVacancyTable;

  summary.probe = await probeCommonApiPaths(origin);

  if (
    process.env.USE_PLAYWRIGHT === "1" ||
    process.env.USE_PLAYWRIGHT === "true"
  ) {
    try {
      summary.playwrightRequests = await interceptWithPlaywright(TARGET);
    } catch (err) {
      summary.playwrightRequests = { error: err.message };
    }
  }

  const blazor =
    summary.html.hits.blazorServer ||
    summary.html.hits.blazorWebAssembly ||
    summary.html.hits.signalR;
  const jsonLooksViable =
    hasVacancyTable ||
    summary.probe.some(
      (p) =>
        p.status === 200 &&
        p.contentType &&
        p.contentType.includes("application/json") &&
        !String(p.path).includes("swagger"),
    );

  summary.conclusion = jsonLooksViable && !blazor
    ? "POSSIBLE: static HTML or JSON API may work without Playwright. Re-test before dropping Chromium."
    : "PLAYWRIGHT STILL REQUIRED: the form is a Blazor/MudBlazor SPA (or no public JSON API was found). Keep Docker/GHA/VPS hosting for Chromium.";

  writeFileSync(
    join(OUT_DIR, "report.json"),
    JSON.stringify(summary, null, 2),
  );
  printReport("MEP API spike", summary);
  console.log(`\nWrote ${join(OUT_DIR, "report.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
