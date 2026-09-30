import { COLLECTIONS } from "@gomep/schema";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import {
  LAST_ADMIN_ERROR,
  wouldRemoveLastAdmin,
  type AccountRole,
} from "./roles";

export async function setUserRoleRecord({
  auth,
  db,
  caller,
  targetUid,
  nextRole,
}: {
  auth: Auth;
  db: Firestore;
  caller: DecodedIdToken;
  targetUid: string;
  nextRole: AccountRole;
}) {
  if (caller.role !== "admin" || caller.email_verified !== true) {
    throw new Error("Solo un admin puede cambiar roles");
  }
  if (nextRole !== "admin" && nextRole !== "docente") {
    throw new Error("Rol inválido");
  }

  const admins = await db
    .collection(COLLECTIONS.usuarios)
    .where("role", "==", "admin")
    .get();
  const adminUids = admins.docs.map((docSnap) => docSnap.id);
  if (wouldRemoveLastAdmin(adminUids, targetUid, nextRole)) {
    throw new Error(LAST_ADMIN_ERROR);
  }

  await auth.setCustomUserClaims(targetUid, { role: nextRole });
  await db.collection(COLLECTIONS.usuarios).doc(targetUid).set(
    { role: nextRole },
    { merge: true },
  );
  return { uid: targetUid, role: nextRole };
}
