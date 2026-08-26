import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS openings (
  id TEXT PRIMARY KEY,
  vacante TEXT NOT NULL DEFAULT '',
  especialidad TEXT NOT NULL DEFAULT '',
  puesto TEXT NOT NULL DEFAULT '',
  institucion TEXT NOT NULL DEFAULT '',
  lecciones TEXT NOT NULL DEFAULT '',
  regional TEXT NOT NULL DEFAULT '',
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_openings_active_regional
  ON openings (active, regional);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  ok INTEGER NOT NULL DEFAULT 0,
  row_count INTEGER,
  content_hash TEXT,
  error TEXT,
  new_count INTEGER,
  gone_count INTEGER,
  changed_count INTEGER
);
`;

export function openingId(opening) {
  const key = [
    opening.regional || "",
    opening.vacante || "",
    opening.institucion || "",
    opening.especialidad || "",
  ].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
}

export function hashOpenings(openings) {
  const canonical = openings
    .map((o) =>
      [
        o.vacante,
        o.especialidad,
        o.puesto,
        o.institucion,
        o.lecciones,
        o.regional,
      ].join("|"),
    )
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export function withIds(openings, regional) {
  return openings.map((o) => {
    const row = { ...o, regional: o.regional || regional || "" };
    return { ...row, id: openingId(row) };
  });
}

function ensureParentDir(url) {
  if (!url.startsWith("file:")) return;
  const filePath = url.slice("file:".length);
  mkdirSync(dirname(filePath), { recursive: true });
}

export function createDbClient(url, authToken) {
  if (!url) return null;
  ensureParentDir(url);
  return createClient({ url, authToken: authToken || undefined });
}

export async function ensureSchema(client) {
  const statements = SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((sql) => ({ sql }));
  await client.batch(statements, "write");
}

function rowToOpening(row) {
  return {
    id: row.id,
    vacante: row.vacante,
    especialidad: row.especialidad,
    puesto: row.puesto,
    institucion: row.institucion,
    lecciones: row.lecciones,
    regional: row.regional,
    first_seen: row.first_seen,
    last_seen: row.last_seen,
    active: Number(row.active),
  };
}

function detailsChanged(prev, next) {
  return prev.puesto !== next.puesto || prev.lecciones !== next.lecciones;
}

/**
 * Diff current scrape against active openings for this regional, persist
 * upserts, and record a scrape_runs row. Returns added/removed/changed.
 */
export async function persistAndDiff(client, openings, { regional, startedAt }) {
  const now = new Date().toISOString();
  const started = startedAt || now;
  const contentHash = hashOpenings(openings);
  const currentById = new Map(openings.map((o) => [o.id, o]));

  const previousOk = await client.execute(
    "SELECT id FROM scrape_runs WHERE ok = 1 ORDER BY id DESC LIMIT 1",
  );
  const isFirstRun = previousOk.rows.length === 0;

  const existingRs = await client.execute({
    sql: "SELECT * FROM openings WHERE active = 1 AND regional = ?",
    args: [regional || ""],
  });
  const existing = existingRs.rows.map(rowToOpening);
  const existingById = new Map(existing.map((o) => [o.id, o]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, opening] of currentById) {
    const prev = existingById.get(id);
    if (!prev) added.push(opening);
    else if (detailsChanged(prev, opening)) changed.push({ prev, next: opening });
  }
  for (const [id, prev] of existingById) {
    if (!currentById.has(id)) removed.push(prev);
  }

  const statements = [];
  for (const opening of openings) {
    statements.push({
      sql: `INSERT INTO openings (
          id, vacante, especialidad, puesto, institucion, lecciones, regional,
          first_seen, last_seen, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET
          puesto = excluded.puesto,
          lecciones = excluded.lecciones,
          last_seen = excluded.last_seen,
          active = 1`,
      args: [
        opening.id,
        opening.vacante,
        opening.especialidad,
        opening.puesto,
        opening.institucion,
        opening.lecciones,
        opening.regional,
        now,
        now,
      ],
    });
  }
  for (const gone of removed) {
    statements.push({
      sql: "UPDATE openings SET active = 0, last_seen = ? WHERE id = ?",
      args: [now, gone.id],
    });
  }
  statements.push({
    sql: `INSERT INTO scrape_runs (
        started_at, finished_at, ok, row_count, content_hash,
        error, new_count, gone_count, changed_count
      ) VALUES (?, ?, 1, ?, ?, NULL, ?, ?, ?)`,
    args: [
      started,
      now,
      openings.length,
      contentHash,
      added.length,
      removed.length,
      changed.length,
    ],
  });

  if (statements.length > 0) {
    await client.batch(statements, "write");
  }

  return {
    added,
    removed,
    changed,
    contentHash,
    isFirstRun,
  };
}

export async function recordFailedRun(client, { startedAt, error }) {
  await client.execute({
    sql: `INSERT INTO scrape_runs (
        started_at, finished_at, ok, row_count, content_hash, error,
        new_count, gone_count, changed_count
      ) VALUES (?, ?, 0, NULL, NULL, ?, NULL, NULL, NULL)`,
    args: [startedAt, new Date().toISOString(), String(error).slice(0, 2000)],
  });
}

export function formatOpeningLine(opening) {
  return `• ${[
    opening.vacante,
    opening.especialidad,
    opening.puesto,
    opening.institucion,
    opening.lecciones,
  ]
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(" | ")}`;
}

export function buildDiffMessage({
  specialty,
  regional,
  added,
  removed,
  changed,
  total,
}) {
  const parts = [];
  if (added.length) parts.push(`${added.length} nueva${added.length === 1 ? "" : "s"}`);
  if (removed.length) {
    parts.push(`${removed.length} desaparecida${removed.length === 1 ? "" : "s"}`);
  }
  if (changed.length) parts.push(`${changed.length} cambio${changed.length === 1 ? "" : "s"}`);

  const title = `Vacantes de ${specialty} en ${regional}: ${parts.join(", ")} (${total} activas)`;

  const sections = [];
  if (added.length) {
    sections.push(`Nuevas:\n${added.map(formatOpeningLine).join("\n")}`);
  }
  if (removed.length) {
    sections.push(`Ya no aparecen:\n${removed.map(formatOpeningLine).join("\n")}`);
  }
  if (changed.length) {
    sections.push(
      `Cambios:\n${changed
        .map(
          ({ prev, next }) =>
            `${formatOpeningLine(next)}\n  (antes: ${prev.puesto} | ${prev.lecciones})`,
        )
        .join("\n")}`,
    );
  }

  return { title, body: sections.join("\n____\n") || "Sin detalle." };
}
