import { createLibsqlStore } from "./libsql.js";
import { createJsonStore } from "./json.js";

/**
 * Both stores expose the same shape so main.js never branches on which one
 * is active: load the previous vacancies, commit the new ones, record failures.
 *
 * A JSON file is enough to answer "did anything change?", which is all the
 * GitHub Actions runner needs. Set DATABASE_URL to keep full history instead.
 * @param {Object} config - App config from `loadConfig`.
 * @returns {Promise<Object>} The created store.
 */
export async function createStore(config) {
  const store = config.databaseUrl
    ? await createLibsqlStore(config)
    : createJsonStore(config);
  await store.init();
  return store;
}