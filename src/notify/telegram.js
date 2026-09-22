import { TELEGRAM_MAX_CHARS, truncateChars } from "./truncate.js";

export async function sendTelegram(message, token, chatId) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: truncateChars(message, TELEGRAM_MAX_CHARS),
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram HTTP ${res.status}: ${res.statusText}`);
  }
}
