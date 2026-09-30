import { setTimeout as delay } from "node:timers/promises";
import { ConfigurationError } from "./errors.js";

/**
 * Retries an async task up to `attempts` times with linearly growing backoff.
 * Configuration errors are rethrown immediately without retrying, since they
 * will fail identically on every attempt.
 * @param {{ attempts: number, delayMs: number }} options
 * @param {() => Promise<any>} task - The async operation to retry.
 * @returns {Promise<any>} Resolves with the task's return value on success.
 * @throws {Error} Re-throws the last error once all attempts are exhausted,
 *   or immediately for `ConfigurationError`.
 */
export async function withRetries({ attempts, delayMs }, task) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (error instanceof ConfigurationError || attempt >= attempts) {
        throw error;
      }
      const backoff = delayMs * attempt;
      console.warn(
        `Intento ${attempt} de ${attempts} falló (${error.message}). Reintentando en ${backoff} ms.`,
      );
      await delay(backoff);
    }
  }
}
