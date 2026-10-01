export type OobCodeRow = {
  email?: string;
  oobCode?: string;
  requestType?: string;
};

export type AuthLinkRequestType = "VERIFY_EMAIL" | "EMAIL_SIGNIN";

export function isLocalAuthDev(input: {
  useEmulators: boolean;
  hostname: string;
}): boolean {
  return (
    input.useEmulators &&
    (input.hostname === "localhost" || input.hostname === "127.0.0.1")
  );
}

export function authCompleteHref(
  origin: string,
  mode: "verifyEmail" | "signIn",
  oobCode: string,
  apiKey?: string,
): string {
  const url = new URL("/auth/complete", origin);
  url.searchParams.set("mode", mode);
  url.searchParams.set("oobCode", oobCode);
  if (apiKey) url.searchParams.set("apiKey", apiKey);
  return url.toString();
}

export function loopbackOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function latestOobCode(
  codes: OobCodeRow[],
  email: string,
  requestType: AuthLinkRequestType,
): OobCodeRow | null {
  const trimmed = email.trim();
  for (let index = codes.length - 1; index >= 0; index -= 1) {
    const row = codes[index];
    if (
      row?.email === trimmed &&
      row.requestType === requestType &&
      row.oobCode
    ) {
      return row;
    }
  }
  return null;
}

export async function resolveLocalAuthLink(options: {
  useEmulators: boolean;
  email: string;
  requestType: AuthLinkRequestType;
  origin: string;
  apiKey?: string;
  loadCodes: () => Promise<OobCodeRow[]>;
}): Promise<{ href: string } | null> {
  if (!options.useEmulators) return null;
  const origin = loopbackOrigin(options.origin);
  if (!origin) return null;
  const match = latestOobCode(
    await options.loadCodes(),
    options.email,
    options.requestType,
  );
  if (!match?.oobCode) return null;
  if (options.requestType === "EMAIL_SIGNIN") {
    if (!options.apiKey) return null;
    return {
      href: authCompleteHref(origin, "signIn", match.oobCode, options.apiKey),
    };
  }
  return { href: authCompleteHref(origin, "verifyEmail", match.oobCode) };
}
