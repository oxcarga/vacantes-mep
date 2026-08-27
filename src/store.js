import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { vacancyId } from "./vacancies.js";

/**
 * Both stores expose the same shape so monitor.js never branches on which one
 * is active: load the previous vacancies, commit the new ones, record failures.
 */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS openings (
    id TEXT PRIMARY KEY,
    regional TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    fields TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE INDEX IF NOT EXISTS idx_openings_active_regional
    ON openings (active, regional)`,
  `CREATE TABLE IF NOT EXISTS scrape_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    ok INTEGER NOT NULL DEFAULT 0,
    regional TEXT,
    row_count INTEGER,
    content_hash TEXT,
    error TEXT,
    new_count INTEGER,
    gone_count INTEGER,
    changed_count INTEGER
  )`,
];

function summarize(vacancy, identityCellNames) {
  return identityCellNames
    .map((name) => vacancy[name])
    .filter(Boolean)
    .join(" | ");
}

export function createJsonStore({ baselinePath, regional, identityCellNames }) {
  return {
    kind: "json",
    description: baselinePath,

    async init() {
      mkdirSync(dirname(baselinePath), { recursive: true });
    },

    async loadPrevious() {
      if (!existsSync(baselinePath)) return { isFirstRun: true, vacancies: [] };
      try {
        const data = JSON.parse(readFileSync(baselinePath, "utf8"));
        if (!Array.isArray(data?.vacancies)) {
          return { isFirstRun: true, vacancies: [] };
        }
        return { isFirstRun: false, vacancies: data.vacancies };
      } catch (error) {
        console.warn(
          `No se pudo leer la línea base en ${baselinePath}: ${error.message}`,
        );
        return { isFirstRun: true, vacancies: [] };
      }
    },

    async commit({ current, added, removed, changed, contentHash }) {
      writeFileSync(
        baselinePath,
        `${JSON.stringify(
          {
            checkedAt: new Date().toISOString(),
            regional,
            contentHash,
            counts: {
              total: current.length,
              added: added.length,
              removed: removed.length,
              changed: changed.length,
            },
            vacancies: current.map((vacancy) => ({
              id: vacancyId(vacancy, identityCellNames, regional),
              ...vacancy,
            })),
          },
          null,
          2,
        )}\n`,
      );
    },

    async recordFailure() {},

    async close() {},
  };
}

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
      const rows = await client.execute({
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
      const statements = current.map((vacancy) => ({
        sql: `INSERT INTO openings (
                id, regional, summary, fields, first_seen, last_seen, active
              ) VALUES (?, ?, ?, ?, ?, ?, 1)
              ON CONFLICT(id) DO UPDATE SET
                summary = excluded.summary,
                fields = excluded.fields,
                last_seen = excluded.last_seen,
                active = 1`,
        args: [
          vacancyId(vacancy, identityCellNames, regional),
          regional,
          summarize(vacancy, identityCellNames),
          JSON.stringify(vacancy),
          now,
          now,
        ],
      }));

      for (const vacancy of removed) {
        statements.push({
          sql: "UPDATE openings SET active = 0, last_seen = ? WHERE id = ?",
          args: [now, vacancyId(vacancy, identityCellNames, regional)],
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

/**
 * A JSON file is enough to answer "did anything change?", which is all the
 * GitHub Actions runner needs. Set DATABASE_URL to keep full history instead.
 */
export async function createStore(config) {
  const store = config.databaseUrl
    ? await createLibsqlStore(config)
    : createJsonStore(config);
  await store.init();
  return store;
}
