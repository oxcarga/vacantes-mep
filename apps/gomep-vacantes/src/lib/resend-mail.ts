export type ResendPayload = {
  to: string;
  subject: string;
  text: string;
};

export type ResendResult =
  | { skipped: true }
  | { skipped: false; ok: true }
  | { skipped: false; ok: false };

type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

const RESEND_URL = "https://api.resend.com/emails";

export async function sendResendMail(
  { to, subject, text }: ResendPayload,
  env: { RESEND_API_KEY?: string; MAIL_FROM?: string } = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM,
  },
  fetchImpl: FetchLike = fetch,
): Promise<ResendResult> {
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
        html: text,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`[mail] Resend ${response.status}: ${body}`);
      return { skipped: false, ok: false };
    }
    return { skipped: false, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mail] fallo al llamar Resend: ${message}`);
    return { skipped: false, ok: false };
  }
}
