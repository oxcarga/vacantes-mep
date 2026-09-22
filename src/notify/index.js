import { sendNtfy } from "./ntfy.js";
import { sendTelegram } from "./telegram.js";

export { buildNotification, specialtyLabel } from "./compose.js";
export {
  NTFY_MAX_BYTES,
  TELEGRAM_MAX_CHARS,
  truncateChars,
  truncateUtf8,
} from "./truncate.js";

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
