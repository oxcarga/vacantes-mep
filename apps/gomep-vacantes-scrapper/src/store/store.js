import { createFirestoreStore } from "./firestore.js";
import { createJsonStore } from "./json.js";

/**
 * Both stores expose the same shape so main.js never branches on which one
 * is active: load the previous vacancies, commit the new ones, record failures.
 *
 * A JSON file is enough for local runs and tests. Firestore is used when a
 * project id is set (Cloud Run injects GOOGLE_CLOUD_PROJECT) or when the
 * emulator host is present.
 *
 * @param {Object} config - App config from `loadConfig`.
 * @returns {Promise<Object>} The created store.
 */
export async function createStore(config) {
  const store = usesFirestore(config)
    ? await createFirestoreStore(config)
    : createJsonStore(config);
  await store.init();
  return store;
}

/**
 * @param {Object} config
 * @returns {boolean}
 */
export function usesFirestore(config) {
  return Boolean(config.firestoreProjectId || config.firestoreEmulatorHost);
}
