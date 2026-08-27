import {
  NTFY_MAX_BYTES,
  TELEGRAM_MAX_CHARS,
  truncateChars,
  truncateUtf8,
} from "./vacancies.js";

async function sendNtfy(message, topic) {
  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    body: truncateUtf8(message, NTFY_MAX_BYTES),
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
  if (!res.ok) {
    throw new Error(`ntfy.sh HTTP ${res.status}: ${res.statusText}`);
  }
}

async function sendTelegram(message, token, chatId) {
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

/**
 * Delivers to every configured channel and only rejects once all of them have
 * been attempted, so a broken Telegram token still lets the ntfy push through.
 */
export async function notify(config, title, body) {
  const message = `${title}\n\n${body}`.trim();
  const deliveries = [];

  if (config.ntfyTopic) {
    deliveries.push(sendNtfy(message, config.ntfyTopic));
  }
  if (config.telegramBotToken && config.telegramChatId) {
    deliveries.push(
      sendTelegram(message, config.telegramBotToken, config.telegramChatId),
    );
  }

  if (deliveries.length === 0) {
    console.log(`Sin canal de notificación configurado. Mensaje:\n${message}`);
    return;
  }

  const results = await Promise.allSettled(deliveries);
  const failures = results.filter((result) => result.status === "rejected");
  for (const failure of failures) {
    console.error("Falló el envío de la notificación:", failure.reason);
  }
  if (failures.length === results.length) {
    throw failures[0].reason;
  }
}
