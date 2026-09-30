import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import { resolveApplyUrl } from "../src/scrape/apply-link.js";
import {
  ConfigurationError,
  fetchVacancyPages,
  withRetries,
} from "../src/scrape/index.js";

describe("resolveApplyUrl", () => {
  it("keeps solicitud under the formulario base path", () => {
    assert.equal(
      resolveApplyUrl(
        "./solicitud?data=abc",
        "https://apps.mep.go.cr/formulario/",
      ),
      "https://apps.mep.go.cr/formulario/solicitud?data=abc",
    );
  });

  it("returns nothing for a blank uri", () => {
    assert.equal(resolveApplyUrl("  ", "https://apps.mep.go.cr/formulario/"), "");
  });
});

describe("fetchVacancyPages retries", () => {
  let server;
  let failuresLeft = 0;
  let requests = 0;
  let config;

  before(async () => {
    server = createServer((_req, res) => {
      requests += 1;
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        res.writeHead(503);
        res.end("no disponible");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<table><tbody></tbody></table>");
    });
    await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
    config = {
      targetUrl: `http://127.0.0.1:${server.address().port}/`,
      usePlaywright: false,
      scrapeAttempts: 3,
      scrapeRetryDelayMs: 1,
    };
  });

  after(() => server.close());

  it("rides out a transient failure from the site", async () => {
    failuresLeft = 2;
    requests = 0;
    const { pages } = await fetchVacancyPages(config);
    assert.equal(pages.length, 1);
    assert.equal(requests, 3);
  });

  it("gives up once the attempts run out", async () => {
    failuresLeft = 5;
    requests = 0;
    await assert.rejects(fetchVacancyPages(config), /HTTP 503/);
    assert.equal(requests, 3);
  });

  it("does not retry when configured not to", async () => {
    failuresLeft = 5;
    requests = 0;
    await assert.rejects(
      fetchVacancyPages({ ...config, scrapeAttempts: 1 }),
      /HTTP 503/,
    );
    assert.equal(requests, 1);
  });

});

describe("withRetries", () => {
  const policy = { attempts: 3, delayMs: 1 };

  it("does not retry a misconfiguration, which would fail the same way", async () => {
    let calls = 0;
    await assert.rejects(
      withRetries(policy, async () => {
        calls += 1;
        throw new ConfigurationError(
          "Recorrer todas las regionales requiere un <select> nativo.",
        );
      }),
      /requiere un <select> nativo/,
    );
    assert.equal(calls, 1);
  });

  it("returns the first successful result", async () => {
    let calls = 0;
    const result = await withRetries(policy, async () => {
      calls += 1;
      return "listo";
    });
    assert.equal(result, "listo");
    assert.equal(calls, 1);
  });
});
