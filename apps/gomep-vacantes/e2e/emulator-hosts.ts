import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type EmulatorPorts = {
  auth: number;
  firestore: number;
};

type EmulatorConfig = {
  emulators: {
    auth: { port: number };
    firestore: { port: number };
  };
};

function configPath(filename: string) {
  const fromApp = resolve(process.cwd(), "../../", filename);
  if (existsSync(fromApp)) return fromApp;
  return resolve(process.cwd(), filename);
}

function readPorts(filename: string): EmulatorPorts {
  const config = JSON.parse(readFileSync(configPath(filename), "utf8")) as EmulatorConfig;
  return {
    auth: config.emulators.auth.port,
    firestore: config.emulators.firestore.port,
  };
}

/** The e2e seed uses `set()` on catalog ids the scraper also owns. */
export function assertEmulatorPortsIsolated(e2ePorts: EmulatorPorts, devPorts: EmulatorPorts) {
  if (e2ePorts.firestore === devPorts.firestore || e2ePorts.auth === devPorts.auth) {
    throw new Error(
      `Los emuladores de e2e (firestore ${e2ePorts.firestore}, auth ${e2ePorts.auth}) no pueden usar los puertos de desarrollo (firestore ${devPorts.firestore}, auth ${devPorts.auth}).`,
    );
  }
}

const e2ePorts = readPorts("firebase.e2e.json");
const devPorts = readPorts("firebase.json");
assertEmulatorPortsIsolated(e2ePorts, devPorts);

export const firestoreEmulatorHost = `127.0.0.1:${e2ePorts.firestore}`;
export const authEmulatorHost = `127.0.0.1:${e2ePorts.auth}`;
