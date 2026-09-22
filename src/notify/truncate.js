/** ntfy rejects bodies over 4 KiB; leave room for headers. */
export const NTFY_MAX_BYTES = 3900;
/** Telegram counts characters, not bytes, and caps a message at 4096. */
export const TELEGRAM_MAX_CHARS = 4000;

/**
 * Trims `text` to fit within `maxBytes` UTF-8 bytes without splitting a
 * multi-byte character in half. Appends a truncation notice when cut.
 * @param {string} text - The text to trim.
 * @param {number} [maxBytes=NTFY_MAX_BYTES]
 * @returns {string}
 */
export function truncateUtf8(text, maxBytes = NTFY_MAX_BYTES) {
  const value = String(text ?? "");
  const buffer = Buffer.from(value, "utf8");
  if (buffer.length <= maxBytes) return value;

  const suffix = "\n… (mensaje recortado)";
  const limit = Math.max(0, maxBytes - Buffer.byteLength(suffix, "utf8"));
  let end = Math.min(buffer.length, limit);
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) end -= 1;
  return `${buffer.subarray(0, end).toString("utf8")}${suffix}`;
}

/**
 * Trims `text` to at most `maxChars` Unicode characters, appending a
 * truncation notice when cut.
 * @param {string} text - The text to trim.
 * @param {number} [maxChars=TELEGRAM_MAX_CHARS]
 * @returns {string}
 */
export function truncateChars(text, maxChars = TELEGRAM_MAX_CHARS) {
  const value = String(text ?? "");
  if (value.length <= maxChars) return value;
  const suffix = "\n… (mensaje recortado)";
  return `${value.slice(0, Math.max(0, maxChars - suffix.length))}${suffix}`;
}
