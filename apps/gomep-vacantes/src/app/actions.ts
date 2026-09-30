"use server";

import { adminAuth, adminDb } from "@/lib/admin-app";
import { ensureUserProfileRecord } from "@/lib/account-service";
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

export async function removeSubscription(idToken: string, subscriptionId: string) {
  const decoded = await verify(idToken);
  return removeSubscriptionRecord({
    db: adminDb(),
    caller: decoded,
    subscriptionId,
  });
}
