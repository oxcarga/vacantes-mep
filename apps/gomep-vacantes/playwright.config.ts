import { defineConfig, devices } from "@playwright/test";
import { authEmulatorHost, firestoreEmulatorHost } from "./e2e/emulator-hosts";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3100 --hostname 127.0.0.1",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_USE_EMULATORS: "1",
      NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "127.0.0.1",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-gomep-vacantes",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-gomep-vacantes.appspot.com",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "0",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:0:web:e2e",
      GCLOUD_PROJECT: "demo-gomep-vacantes",
      GOOGLE_CLOUD_PROJECT: "demo-gomep-vacantes",
      FIRESTORE_EMULATOR_HOST: firestoreEmulatorHost,
      FIREBASE_AUTH_EMULATOR_HOST: authEmulatorHost,
      NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: firestoreEmulatorHost,
      NEXT_PUBLIC_AUTH_EMULATOR_HOST: authEmulatorHost,
    },
  },
});
