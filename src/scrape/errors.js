/** Retrying will not fix a wrong regional or a missing setting. */
export class ConfigurationError extends Error {
  name = "ConfigurationError";
}
