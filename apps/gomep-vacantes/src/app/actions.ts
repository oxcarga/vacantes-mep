"use server";

import { adminAuth, adminDb } from "@/lib/admin-app";
import { ensureUserProfileRecord } from "@/lib/account-service";
import {
  latestOobCode,
  resolveLocalAuthLink,
  type AuthLinkRequestType,
  type OobCodeRow,
} from "@/lib/local-auth-link";
import { setUserRoleRecord } from "@/lib/role-service";
import {
  createSubscriptionRecord,
  removeSubscriptionRecord,
} from "@/lib/subscription-service";
import type { AccountRole } from "@/lib/roles";

async function verify(idToken: string) {
  return adminAuth().verifyIdToken(idToken);
}

export async function ensureUserProfile(
  idToken: string,
  profile: { name: string; phone: string },
) {
  if (!profile.name?.trim() || !profile.phone?.trim()) {
    throw new Error("Faltan nombre o teléfono");
  }
  const decoded = await verify(idToken);
  return ensureUserProfileRecord({
    auth: adminAuth(),
    db: adminDb(),
    decoded,
    profile,
    adminEmails: process.env.ADMIN_EMAILS,
  });
}

export async function setUserRole(
  idToken: string,
  targetUid: string,
  nextRole: AccountRole,
) {
  const decoded = await verify(idToken);
  return setUserRoleRecord({
    auth: adminAuth(),
    db: adminDb(),
    caller: decoded,
    targetUid,
    nextRole,
  });
}

export async function createSubscription(
  idToken: string,
  regionalValue: string,
  especialidad: string,
) {
  const decoded = await verify(idToken);
  return createSubscriptionRecord({
    db: adminDb(),
    caller: decoded,
    regionalValue,
    especialidad,
  });
}

function emulatorProjectId() {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "demo-gomep-vacantes"
  );
}

function emulatorAuthBase() {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host.replace(/\/$/, "");
  }
  return `http://${host}`;
}

async function fetchOobCodes(): Promise<OobCodeRow[]> {
  const response = await fetch(
    `${emulatorAuthBase()}/emulator/v1/projects/${emulatorProjectId()}/oobCodes`,
  );
  if (!response.ok) return [];
  const body = (await response.json()) as { oobCodes?: OobCodeRow[] };
  return body.oobCodes ?? [];
}

async function pollOobCodes(
  email: string,
  requestType: AuthLinkRequestType,
): Promise<OobCodeRow[]> {
  const deadline = Date.now() + 5_000;
  let latest: OobCodeRow[] = [];
  while (true) {
    latest = await fetchOobCodes();
    if (latestOobCode(latest, email, requestType) || Date.now() >= deadline) {
      return latest;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function readLocalAuthLink(
  email: string,
  kind: "verify" | "signin",
  origin: string,
): Promise<{ href: string } | null> {
  const requestType = kind === "verify" ? "VERIFY_EMAIL" : "EMAIL_SIGNIN";
  try {
    return await resolveLocalAuthLink({
      useEmulators: process.env.NEXT_PUBLIC_USE_EMULATORS === "1",
      email,
      requestType,
      origin,
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      loadCodes: () => pollOobCodes(email, requestType),
    });
  } catch {
    return null;
  }
}

export async function removeSubscription(idToken: string, subscriptionId: string) {
  const decoded = await verify(idToken);
  return removeSubscriptionRecord({
    db: adminDb(),
    caller: decoded,
    subscriptionId,
  });
}
