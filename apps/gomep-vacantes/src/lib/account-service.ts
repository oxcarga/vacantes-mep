import { COLLECTIONS } from "@gomep/schema";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import { roleForEmail, type AccountRole } from "./roles";

export type EnsureProfileInput = {
  name: string;
  phone: string;
};

export async function ensureUserProfileRecord({
  auth,
  db,
  decoded,
  profile,
  adminEmails,
}: {
  auth: Auth;
  db: Firestore;
  decoded: DecodedIdToken;
  profile: EnsureProfileInput;
  adminEmails: string | undefined;
}) {
  const ref = db.collection(COLLECTIONS.usuarios).doc(decoded.uid);
  const existing = await ref.get();
  if (existing.exists) {
    return existing.data();
  }
  const role: AccountRole = roleForEmail(decoded.email, adminEmails);
  await auth.setCustomUserClaims(decoded.uid, { role });
  const data = {
    name: profile.name.trim(),
    email: decoded.email ?? "",
    phone: profile.phone.trim(),
    role,
    createdAt: new Date().toISOString(),
  };
  await ref.set(data);
  return data;
}
