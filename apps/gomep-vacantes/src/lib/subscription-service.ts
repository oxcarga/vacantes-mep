import { COLLECTIONS } from "@gomep/schema";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import {
  canCreateSubscription,
  canRemoveSubscription,
  subscriptionExpiresAt,
} from "./subscriptions";

export async function createSubscriptionRecord({
  db,
  caller,
  regionalValue,
  especialidad,
}: {
  db: Firestore;
  caller: DecodedIdToken;
  regionalValue: string;
  especialidad: string;
}) {
  const regional = await db.collection(COLLECTIONS.regionales).doc(regionalValue).get();
  const especialidades = await db
    .collection(COLLECTIONS.especialidades)
    .where("name", "==", especialidad)
    .limit(1)
    .get();
  const active = await db
    .collection(COLLECTIONS.suscripciones)
    .where("uid", "==", caller.uid)
    .where("status", "==", "active")
    .where("regionalValue", "==", regionalValue)
    .where("especialidad", "==", especialidad)
    .limit(1)
    .get();

  const allowed = canCreateSubscription({
    role: String(caller.role ?? ""),
    emailVerified: caller.email_verified === true,
    regionalExists: regional.exists,
    especialidadExists: !especialidades.empty,
    hasActivePair: !active.empty,
  });
  if (!allowed.ok) {
    throw new Error(allowed.error);
  }

  const createdAt = new Date();
  const data = {
    uid: caller.uid,
    regionalValue,
    especialidad,
    status: "active" as const,
    createdAt: createdAt.toISOString(),
    expiresAt: subscriptionExpiresAt(createdAt),
    endedAt: null,
    endReason: null,
    reminders: {},
  };
  const ref = await db.collection(COLLECTIONS.suscripciones).add(data);
  return { id: ref.id, ...data };
}

export async function removeSubscriptionRecord({
  db,
  caller,
  subscriptionId,
}: {
  db: Firestore;
  caller: DecodedIdToken;
  subscriptionId: string;
}) {
  const ref = db.collection(COLLECTIONS.suscripciones).doc(subscriptionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Suscripción no encontrada");
  }
  const data = snap.data() ?? {};
  const allowed = canRemoveSubscription({
    role: String(caller.role ?? ""),
    emailVerified: caller.email_verified === true,
    ownerUid: String(data.uid ?? ""),
    callerUid: caller.uid,
    status: String(data.status ?? ""),
  });
  if (!allowed.ok) {
    throw new Error(allowed.error);
  }
  const endedAt = new Date().toISOString();
  await ref.update({
    status: "inactive",
    endReason: "removed",
    endedAt,
  });
  return { id: subscriptionId, status: "inactive", endReason: "removed", endedAt };
}
