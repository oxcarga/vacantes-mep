/**
 * Export every Firestore document to backups/<target>-<timestamp>.json.
 *
 * Usage (from the repository root):
 *   node .cursor/skills/db-backup/scripts/export-firestore.mjs local
 *   node .cursor/skills/db-backup/scripts/export-firestore.mjs remote
 *   node .cursor/skills/db-backup/scripts/export-firestore.mjs remote --project <gcp-project-id>
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase-admin/app";
import {
  DocumentReference,
  FieldPath,
  GeoPoint,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";

const LOCAL_HOST = "127.0.0.1";
const LOCAL_PORT = 8080;
const LOCAL_PROJECT_ID = "demo-gomep-vacantes";
const PAGE_SIZE = 300;

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const targetToken = (argv[0] || "").toLowerCase();
  const target =
    targetToken === "local"
      ? "local"
      : targetToken === "remote" || targetToken === "remoto"
        ? "remote"
        : "";
  let projectId = "";
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === "--project") {
      projectId = argv[i + 1] || "";
      i += 1;
    } else if (argv[i].startsWith("--project=")) {
      projectId = argv[i].slice("--project=".length);
    } else {
      fail(`Argumento desconocido: ${argv[i]}`);
    }
  }
  if (!target) {
    fail(
      "Indica el origen: local o remote. Ejemplo: node .cursor/skills/db-backup/scripts/export-firestore.mjs local",
    );
  }
  return { target, projectId };
}

function readEnvValue(filePath, key) {
  let text = "";
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
  for (const line of text.split("\n")) {
    const match = line.match(
      new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)$`),
    );
    if (!match) continue;
    return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function gcloudProject() {
  try {
    const value = execFileSync("gcloud", ["config", "get-value", "project"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!value || value === "(unset)") return "";
    return value;
  } catch {
    return "";
  }
}

function remoteProjectId(explicit) {
  const candidates = [
    explicit,
    process.env.FIRESTORE_PROJECT_ID,
    process.env.GOOGLE_CLOUD_PROJECT,
    readEnvValue(
      path.join(repoRoot, "apps/gomep-vacantes-scrapper/.env"),
      "FIRESTORE_PROJECT_ID",
    ),
    readEnvValue(
      path.join(repoRoot, "apps/gomep-vacantes/.env.local"),
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    ),
    readEnvValue(
      path.join(repoRoot, "apps/gomep-vacantes/.env"),
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    ),
    gcloudProject(),
  ];
  const projectId = candidates.find(
    (value) => value && value !== LOCAL_PROJECT_ID,
  );
  if (!projectId) {
    fail(
      "No hay un project id remoto. Pasa --project <gcp-project-id> o define FIRESTORE_PROJECT_ID. demo-gomep-vacantes es solo el emulador.",
    );
  }
  return projectId;
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

function stamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function serialize(value) {
  if (value == null || typeof value !== "object") return value;
  if (value instanceof Timestamp) {
    return {
      __type: "timestamp",
      iso: value.toDate().toISOString(),
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }
  if (value instanceof GeoPoint) {
    return {
      __type: "geopoint",
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }
  if (value instanceof DocumentReference) {
    return { __type: "ref", path: value.path };
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { __type: "bytes", base64: Buffer.from(value).toString("base64") };
  }
  if (typeof value.toBase64 === "function" && value.constructor?.name === "Bytes") {
    return { __type: "bytes", base64: value.toBase64() };
  }
  if (Array.isArray(value)) return value.map(serialize);
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = serialize(child);
  }
  return out;
}

async function readDocuments(collectionRef) {
  const documents = [];
  let last = null;
  for (;;) {
    let query = collectionRef.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
      const subcollections = [];
      for (const child of await doc.ref.listCollections()) {
        subcollections.push({
          id: child.id,
          documents: await readDocuments(child),
        });
      }
      const entry = { id: doc.id, data: serialize(doc.data()) };
      if (subcollections.length > 0) entry.subcollections = subcollections;
      documents.push(entry);
    }
    if (snapshot.size < PAGE_SIZE) break;
    last = snapshot.docs[snapshot.docs.length - 1];
  }
  return documents;
}

function countDocuments(documents) {
  let total = 0;
  for (const document of documents) {
    total += 1;
    for (const child of document.subcollections ?? []) {
      total += countDocuments(child.documents);
    }
  }
  return total;
}

async function main() {
  const { target, projectId: explicitProject } = parseArgs(process.argv.slice(2));
  const projectId =
    target === "local" ? LOCAL_PROJECT_ID : remoteProjectId(explicitProject);

  if (target === "local") {
    process.env.FIRESTORE_EMULATOR_HOST = `${LOCAL_HOST}:${LOCAL_PORT}`;
    const open = await portOpen(LOCAL_HOST, LOCAL_PORT);
    if (!open) {
      fail(
        `El emulador de Firestore no está escuchando en ${LOCAL_HOST}:${LOCAL_PORT}. Arráncalo con npm run emulators y vuelve a ejecutar /db-backup local.`,
      );
    }
  } else {
    delete process.env.FIRESTORE_EMULATOR_HOST;
  }

  const exportedAt = new Date();
  const fileStem = `${target}-${stamp(exportedAt)}`;
  const backupDir = path.join(repoRoot, "backups");
  const backupPath = path.join(backupDir, `${fileStem}.json`);
  mkdirSync(backupDir, { recursive: true });

  const app = initializeApp({ projectId }, `db-backup-${fileStem}`);
  const db = getFirestore(app);
  const collections = {};
  const counts = [];
  let documentCount = 0;

  for (const collectionRef of await db.listCollections()) {
    const documents = await readDocuments(collectionRef);
    const count = countDocuments(documents);
    documentCount += count;
    collections[collectionRef.id] = documents;
    counts.push({ id: collectionRef.id, documents: count });
  }

  writeFileSync(
    backupPath,
    `${JSON.stringify(
      {
        target,
        projectId,
        exportedAt: exportedAt.toISOString(),
        documentCount,
        collections,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        target,
        projectId,
        path: path.relative(repoRoot, backupPath),
        collections: counts,
        documentCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error?.message || String(error);
  if (/credential|Could not load the default credentials|UNAUTHENTICATED/i.test(message)) {
    fail(
      `No se pudo autenticar contra Firestore remoto (${message}). Hace falta Application Default Credentials.`,
    );
  }
  fail(message);
});
