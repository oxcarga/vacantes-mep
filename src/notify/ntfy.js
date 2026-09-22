import { NTFY_MAX_BYTES, truncateUtf8 } from "./truncate.js";

export async function sendNtfy(message, topic) {
  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: truncateUtf8(message, NTFY_MAX_BYTES),
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
  if (!res.ok) {
    throw new Error(`ntfy.sh HTTP ${res.status}: ${res.statusText}`);
  }
}
