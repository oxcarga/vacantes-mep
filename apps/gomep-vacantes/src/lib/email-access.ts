import { authCompleteHref } from "./local-auth-link";

export const EMAIL_ACCESS_COPY = {
  missing: "No hay una cuenta con ese correo. Regístrese para crear una.",
  verify: "Primero valide su cuenta. Le enviamos el enlace de verificación.",
  magic: "Revise su correo para el enlace de acceso.",
  verifiedDone:
    "Su correo quedó verificado. Vuelva a Entrar y pida el magic link.",
  sendError: "No se pudo enviar el enlace de verificación.",
  empty: "Ingrese su correo.",
} as const;

export type EmailAccessKind = "missing" | "verify" | "magic";

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function classifyEmailAccount(
  account: { emailVerified: boolean } | null,
): EmailAccessKind {
  if (!account) return "missing";
  return account.emailVerified ? "magic" : "verify";
}

export function verificationContinueUrl(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Origen no válido");
  }
  return `${url.origin}/?verificado=1`;
}

export function localVerifyHref(
  generatedLink: string,
  origin: string,
): string | null {
  const oobCode = new URL(generatedLink).searchParams.get("oobCode");
  if (!oobCode) return null;
  return authCompleteHref(origin, "verifyEmail", oobCode);
}

export type EmailAccessResult =
  | { kind: "missing" }
  | { kind: "magic" }
  | { kind: "verify"; href?: string }
  | { kind: "error"; message: string };

type AuthLookup = {
  getUserByEmail(email: string): Promise<{ emailVerified: boolean }>;
  generateEmailVerificationLink(
    email: string,
    settings: { url: string; handleCodeInApp: boolean },
  ): Promise<string>;
};

export type VerificationMail = {
  to: string;
  subject: string;
  text: string;
};

export async function decideEmailAccess(options: {
  email: string;
  origin: string;
  local: boolean;
  auth: AuthLookup;
  sendMail: (
    payload: VerificationMail,
  ) => Promise<{ ok?: boolean; skipped?: boolean }>;
}): Promise<EmailAccessResult> {
  const email = normalizeAuthEmail(options.email);
  if (!email) return { kind: "error", message: EMAIL_ACCESS_COPY.empty };

  let account: { emailVerified: boolean } | null = null;
  try {
    account = await options.auth.getUserByEmail(email);
  } catch (error) {
    if (isUserNotFound(error)) return { kind: "missing" };
    return { kind: "error", message: EMAIL_ACCESS_COPY.sendError };
  }

  const kind = classifyEmailAccount(account);
  if (kind !== "verify") return { kind };

  let generated: string;
  try {
    generated = await options.auth.generateEmailVerificationLink(email, {
      url: verificationContinueUrl(options.origin),
      handleCodeInApp: false,
    });
  } catch {
    return { kind: "error", message: EMAIL_ACCESS_COPY.sendError };
  }

  if (options.local) {
    const href = localVerifyHref(generated, options.origin);
    return href ? { kind: "verify", href } : { kind: "verify" };
  }

  const sent = await options.sendMail({
    to: email,
    subject: "Verifique su cuenta",
    text: `${EMAIL_ACCESS_COPY.verify}\n${generated}`,
  });
  if (!sent.ok || sent.skipped) {
    return { kind: "error", message: EMAIL_ACCESS_COPY.sendError };
  }
  return { kind: "verify" };
}

function isUserNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "auth/user-not-found"
  );
}
