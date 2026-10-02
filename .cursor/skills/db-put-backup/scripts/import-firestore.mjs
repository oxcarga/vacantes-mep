/**
 * Replace every document in the local Firestore emulator with a backup.
 *
 * Usage (from the repository root):
 *   node .cursor/skills/db-put-backup/scripts/import-firestore.mjs --list
 *   node .cursor/skills/db-put-backup/scripts/import-firestore.mjs <name-or-path>
 *
 * A bare filename is resolved under backups/. A path points at the JSON file.
 * The database is cleared before any write.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { GeoPoint, Timestamp, getFirestore } from "firebase-admin/firestore";

const LOCAL_HOST = "127.0.0.1";
const LOCAL_PORT = 8080;
const LOCAL_PROJECT_ID = "demo-gomep-vacantes";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const backupsDir = path.join(repoRoot, "backups");

function userError(message) {
  const error = new Error(message);
  error.userFacing = true;
  return error;
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--list") return { list: true };
  const flag = argv.find((arg) => arg.startsWith("--"));
  if (flag) throw userError(`Argumento desconocido: ${flag}`);
  if (argv.length === 0) {
    throw userError(
      "Indica el nombre o la ruta del backup. Para ver la carpeta backups/, ejecuta el script con --list.",
    );
  }
  if (argv.length !== 1) throw userError("Indica un solo backup.");
  return { list: false, input: argv[0] };
}

function assertId(id, where) {
  if (typeof id !== "string" || !id || id === "." || id === ".." || id.includes("/")) {
    throw userError(`Id inválido en ${where}: ${JSON.stringify(id)}`);
  }
}

function validateValue(value, where) {
  if (value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateValue(item, `${where}[${index}]`));
    return;
  }
  if (typeof value.__type === "string") {
    switch (value.__type) {
      case "timestamp":
        if (!Number.isInteger(value.seconds) && typeof value.iso !== "string") {
          throw userError(`Timestamp inválido en ${where}`);
        }
        return;
      case "geopoint":
        if (typeof value.latitude !== "number" || typeof value.longitude !== "number") {
          throw userError(`Geopoint inválido en ${where}`);
        }
        return;
      case "ref":
        if (typeof value.path !== "string" || !value.path) {
          throw userError(`Referencia inválida en ${where}`);
        }
        return;
      case "bytes":
        if (typeof value.base64 !== "string") {
          throw userError(`Bytes inválidos en ${where}`);
        }
        return;
      default:
        throw userError(`Tipo desconocido (${value.__type}) en ${where}`);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    validateValue(child, `${where}.${key}`);
  }
}

function validateDocuments(documents, where) {
  if (!Array.isArray(documents)) {
    throw userError(`Se esperaba una lista de documentos en ${where}`);
  }
  for (const document of documents) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw userError(`Documento inválido en ${where}`);
    }
    assertId(document.id, where);
    if (
      document.data == null ||
      typeof document.data !== "object" ||
      Array.isArray(document.data)
    ) {
      throw userError(`El documento ${document.id} en ${where} no tiene data`);
    }
    validateValue(document.data, `${where}/${document.id}`);
    if (document.subcollections == null) continue;
    if (!Array.isArray(document.subcollections)) {
      throw userError(`Subcolecciones inválidas en ${where}/${document.id}`);
    }
    for (const sub of document.subcollections) {
      assertId(sub?.id, `${where}/${document.id}`);
      validateDocuments(sub.documents, `${where}/${document.id}/${sub.id}`);
    }
  }
}

function countDocuments(documents) {
  let total = 0;
  for (const document of documents) {
    total += 1;
    for (const child of document.subcollections ?? []) {
      total += countDocuments(child.documents ?? []);
    }
  }
  return total;
}

function relativeToRepo(target) {
  const relative = path.relative(repoRoot, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return target;
  return relative.split(path.sep).join("/");
}

export function resolveBackupInput(input) {
  const original = String(input ?? "").trim();
  if (!original) throw userError("Indica el nombre o la ruta del backup.");
  const trimmed = original.replace(/[\\/]+$/, "");
  if (!trimmed) throw userError("Indica el nombre o la ruta del backup.");

  const hasPathSep = trimmed.includes("/") || trimmed.includes("\\");
  let resolved = path.isAbsolute(original) || hasPathSep
    ? path.resolve(repoRoot, trimmed)
    : path.join(backupsDir, trimmed);

  if (!existsSync(resolved)) {
    const withJson = resolved.endsWith(".json") ? resolved : `${resolved}.json`;
    if (withJson !== resolved && existsSync(withJson)) resolved = withJson;
  }
  if (!existsSync(resolved)) {
    throw userError(`No existe el backup: ${relativeToRepo(resolved)}`);
  }
  if (!statSync(resolved).isFile()) {
    throw userError(`El backup debe ser un archivo JSON: ${relativeToRepo(resolved)}`);
  }
  return resolved;
}

export function loadBackup(file) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw userError(`JSON inválido en ${relativeToRepo(file)}: ${error.message}`);
  }
  if (
    !parsed ||
    typeof parsed.collections !== "object" ||
    parsed.collections == null ||
    Array.isArray(parsed.collections)
  ) {
    throw userError(
      `Formato inválido en ${relativeToRepo(file)}. Se espera el JSON de /db-backup, con collections.`,
    );
  }

  const collections = [];
  for (const [id, documents] of Object.entries(parsed.collections)) {
    assertId(id, relativeToRepo(file));
    validateDocuments(documents, id);
    collections.push({
      id,
      documents,
      count: countDocuments(documents),
    });
  }

  return {
    file,
    source: typeof parsed.target === "string" ? parsed.target : null,
    collections,
    documentCount: collections.reduce((total, collection) => total + collection.count, 0),
  };
}

export function deserialize(value, db) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => deserialize(item, db));
  if (typeof value.__type === "string") {
    switch (value.__type) {
      case "timestamp":
        if (Number.isInteger(value.seconds)) {
          return new Timestamp(value.seconds, value.nanoseconds ?? 0);
        }
        return Timestamp.fromDate(new Date(value.iso));
      case "geopoint":
        return new GeoPoint(value.latitude, value.longitude);
      case "ref":
        return db.doc(value.path);
      case "bytes":
        return Buffer.from(value.base64, "base64");
      default:
        throw userError(`Tipo desconocido en el backup: ${value.__type}`);
    }
  }
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = deserialize(child, db);
  }
  return out;
}

function portOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1000, () => done(false));
  });
}

function peekBackup(file) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed.collections !== "object" ||
    parsed.collections == null ||
    Array.isArray(parsed.collections)
  ) {
    return null;
  }
  const collections = [];
  for (const [id, documents] of Object.entries(parsed.collections)) {
    if (!Array.isArray(documents)) return null;
    collections.push({ id, documents: countDocuments(documents) });
  }
  return {
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : null,
    source: typeof parsed.target === "string" ? parsed.target : null,
    documentCount: collections.reduce((total, collection) => total + collection.documents, 0),
    collections,
  };
}

function listBackups() {
  if (!existsSync(backupsDir)) return [];
  const entries = [];
  for (const entry of readdirSync(backupsDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || !entry.isFile()) continue;
    const absolute = path.join(backupsDir, entry.name);
    const item = {
      name: entry.name,
      path: relativeToRepo(absolute),
      kind: "other",
      exportedAt: null,
      source: null,
      documentCount: null,
      collections: null,
    };
    const peek = peekBackup(absolute);
    if (peek) Object.assign(item, peek, { kind: "backup" });
    entries.push(item);
  }
  entries.sort((a, b) => {
    const aKey = a.exportedAt || "";
    const bKey = b.exportedAt || "";
    if (aKey !== bKey) return bKey.localeCompare(aKey);
    return a.name.localeCompare(b.name);
  });
  return entries;
}

async function clearEmulator() {
  const url = new URL(`http://${LOCAL_HOST}:${LOCAL_PORT}/`);
  url.pathname = `/emulator/v1/projects/${LOCAL_PROJECT_ID}/databases/(default)/documents`;
  let response;
  try {
    response = await fetch(url, { method: "DELETE" });
  } catch (error) {
    throw userError(
      `No se pudo limpiar el emulador en ${LOCAL_HOST}:${LOCAL_PORT}: ${error.message}`,
    );
  }
  if (!response.ok) {
    const body = await response.text();
    throw userError(`No se pudo limpiar Firestore (${response.status}): ${body}`);
  }
}

function queueDocuments(db, collectionRef, documents, writer) {
  for (const document of documents) {
    const ref = collectionRef.doc(document.id);
    writer.set(ref, deserialize(document.data, db));
    for (const sub of document.subcollections ?? []) {
      queueDocuments(db, ref.collection(sub.id), sub.documents ?? [], writer);
    }
  }
}

async function restore(backup) {
  process.env.FIRESTORE_EMULATOR_HOST = `${LOCAL_HOST}:${LOCAL_PORT}`;
  const open = await portOpen(LOCAL_HOST, LOCAL_PORT);
  if (!open) {
    throw userError(
      `El emulador de Firestore no está escuchando en ${LOCAL_HOST}:${LOCAL_PORT}. Arráncalo con npm run emulators y vuelve a ejecutar /db-put-backup.`,
    );
  }

  await clearEmulator();
  let app;
  try {
    app = initializeApp({ projectId: LOCAL_PROJECT_ID }, "db-put-backup");
    const db = getFirestore(app);
    const leftover = await db.listCollections();
    for (const collection of leftover) {
      await db.recursiveDelete(collection);
    }
    const stillThere = await db.listCollections();
    if (stillThere.length > 0) {
      throw userError(
        `No se pudo vaciar la base. Quedan: ${stillThere.map((collection) => collection.id).join(", ")}`,
      );
    }

    const writer = db.bulkWriter();
    writer.onWriteError((error) => error.failedAttempts < 3);
    for (const collection of backup.collections) {
      queueDocuments(db, db.collection(collection.id), collection.documents, writer);
    }
    await writer.close();

    return {
      ok: true,
      target: "local",
      projectId: LOCAL_PROJECT_ID,
      emulator: `${LOCAL_HOST}:${LOCAL_PORT}`,
      backup: relativeToRepo(backup.file),
      source: backup.source,
      cleared: true,
      collections: backup.collections.map((collection) => ({
        id: collection.id,
        documents: collection.count,
      })),
      documentCount: backup.documentCount,
    };
  } catch (error) {
    const message = error?.message || String(error);
    throw userError(
      `El emulador local ya se limpió, pero la restauración no terminó: ${message}`,
    );
  } finally {
    if (app) await deleteApp(app).catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.list) {
    console.log(JSON.stringify({ ok: true, backups: listBackups() }, null, 2));
    return;
  }
  const backup = loadBackup(resolveBackupInput(args.input));
  const result = await restore(backup);
  console.log(JSON.stringify(result, null, 2));
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().catch((error) => {
    const message = error?.message || String(error);
    if (error?.userFacing) {
      console.error(message);
    } else if (/credential|Could not load the default credentials|UNAUTHENTICATED/i.test(message)) {
      console.error(
        `No se pudo autenticar (${message}). Este comando solo restaura el emulador local.`,
      );
    } else {
      console.error(message);
    }
    process.exit(1);
  });
}
