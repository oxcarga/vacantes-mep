const RESEND_URL = "https://api.resend.com/emails";

/**
 * Sends one transactional email via Resend. Missing credentials log and skip
 * so a scrape still finishes.
 *
 * @param {{ to: string, subject: string, text: string, html?: string }} payload
 * @param {NodeJS.ProcessEnv} [env]
 * @param {typeof fetch} [fetchImpl]
 */
export async function sendMail(
  { to, subject, text, html },
  env = process.env,
  fetchImpl = fetch,
) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;
  if (!apiKey || !from) {
    console.log(
      `[mail] omitido (sin RESEND_API_KEY o MAIL_FROM): to=${to} subject=${subject}`,
    );
    return { skipped: true };
  }

  try {
    const response = await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: html ?? text,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`[mail] Resend ${response.status}: ${body}`);
      return { skipped: false, ok: false };
    }
    return { skipped: false, ok: true };
  } catch (error) {
    console.error(`[mail] fallo al llamar Resend: ${error.message || error}`);
    return { skipped: false, ok: false };
  }
}
