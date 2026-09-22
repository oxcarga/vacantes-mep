import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { vacancyId, vacancyRegional } from "../vacancies/identity.js";
import { SCHEMA, summarize } from "./schema.js";

async function loadLibsql() {
  try {
    return await import("@libsql/client");
  } catch (error) {
    throw new Error(
      `DATABASE_URL está configurado pero no se pudo cargar @libsql/client: ${error.message}. Ejecute npm install.`,
    );
  }
}

export async function createLibsqlStore({
  databaseUrl,
  databaseAuthToken,
  regional,
  identityCellNames,
  scrapeAllRegionales = false,
}) {
  const { createClient } = await loadLibsql();

  if (databaseUrl.startsWith("file:")) {
    mkdirSync(dirname(databaseUrl.slice("file:".length)), { recursive: true });
  }

  const client = createClient({
    url: databaseUrl,
    authToken: databaseAuthToken || undefined,
  });

  return {
    kind: "libsql",
    description: databaseUrl.replace(/:[^@/]+@/, ":***@"),

    async init() {
      await client.batch(
        SCHEMA.map((sql) => ({ sql })),
        "write",
      );
    },

    async loadPrevious() {
      const runs = await client.execute(
        "SELECT id FROM scrape_runs WHERE ok = 1 ORDER BY id DESC LIMIT 1",
      );
      const rows = scrapeAllRegionales
        ? await client.execute(
            "SELECT fields FROM openings WHERE active = 1",
          )
        : await client.execute({
            sql: "SELECT fields FROM openings WHERE active = 1 AND regional = ?",
            args: [regional],
          });
      return {
        isFirstRun: runs.rows.length === 0,
        vacancies: rows.rows.map((row) => JSON.parse(row.fields)),
      };
    },

    async commit({ current, added, removed, changed, startedAt, contentHash }) {
      const now = new Date().toISOString();
      const statements = current.map((vacancy) => {
        const scope = vacancyRegional(vacancy, regional);
        return {
          sql: `INSERT INTO openings (
                id, regional, summary, fields, first_seen, last_seen, active
              ) VALUES (?, ?, ?, ?, ?, ?, 1)
              ON CONFLICT(id) DO UPDATE SET
                summary = excluded.summary,
                fields = excluded.fields,
                last_seen = excluded.last_seen,
                active = 1`,
          args: [
            vacancyId(vacancy, identityCellNames, scope),
            scope,
            summarize(vacancy, identityCellNames),
            JSON.stringify(vacancy),
            now,
            now,
          ],
        };
      });

      for (const vacancy of removed) {
        statements.push({
          sql: "UPDATE openings SET active = 0, last_seen = ? WHERE id = ?",
          args: [
            now,
            vacancyId(
              vacancy,
              identityCellNames,
              vacancyRegional(vacancy, regional),
            ),
          ],
        });
      }

      statements.push({
        sql: `INSERT INTO scrape_runs (
                started_at, finished_at, ok, regional, row_count, content_hash,
                error, new_count, gone_count, changed_count
              ) VALUES (?, ?, 1, ?, ?, ?, NULL, ?, ?, ?)`,
        args: [
          startedAt,
          now,
          regional,
          current.length,
          contentHash,
          added.length,
          removed.length,
          changed.length,
        ],
      });

      await client.batch(statements, "write");
    },

    async recordFailure({ startedAt, error }) {
      await client.execute({
        sql: `INSERT INTO scrape_runs (
                started_at, finished_at, ok, regional, error
              ) VALUES (?, ?, 0, ?, ?)`,
        args: [
          startedAt,
          new Date().toISOString(),
          regional,
          String(error).slice(0, 2000),
        ],
      });
    },

    async close() {
      if (typeof client.close === "function") client.close();
    },
  };
}
