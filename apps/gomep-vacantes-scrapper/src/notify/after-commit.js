import { COLLECTIONS } from "@gomep/schema";
import { sendMail as defaultSendMail } from "../mail/resend.js";
import { dispatchCommitMail } from "./mail-logic.js";

/**
 * After vacantes and catalogs are committed, email matching subscribers and
 * process reminder windows, then expire overdue rows.
 *
 * @param {object} options
 * @param {FirebaseFirestore.Firestore} options.db
 * @param {object[]} options.added
 * @param {Date} [options.now]
 * @param {typeof defaultSendMail} [options.sendMail]
 */
export async function notifyAfterSuccessfulCommit({
  db,
  added,
  now = new Date(),
  sendMail = defaultSendMail,
}) {
  const snap = await db.collection(COLLECTIONS.suscripciones).where("status", "==", "active").get();
  const subscriptions = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (subscriptions.length === 0) return;

  const uids = [...new Set(subscriptions.map((sub) => sub.uid).filter(Boolean))];
  const usersByUid = {};
  if (uids.length > 0) {
    const refs = uids.map((uid) => db.collection(COLLECTIONS.usuarios).doc(uid));
    const users = await db.getAll(...refs);
    for (const user of users) {
      if (user.exists) usersByUid[user.id] = user.data();
    }
  }

  const { reminderUpdates, expiredIds } = await dispatchCommitMail({
    added: added.map((vacancy) => ({
      ...vacancy,
      regionalValue: vacancy.regionalValue ?? "",
    })),
    subscriptions,
    usersByUid,
    now,
    sendMail,
  });

  const batch = db.batch();
  let writes = 0;
  for (const update of reminderUpdates) {
    const ref = db.collection(COLLECTIONS.suscripciones).doc(update.id);
    const patch = {};
    if (update.send != null) patch[`reminders.${update.send}`] = "sent";
    for (const window of update.skip) patch[`reminders.${window}`] = "skipped";
    batch.update(ref, patch);
    writes += 1;
  }
  const endedAt = now.toISOString();
  for (const id of expiredIds) {
    batch.update(db.collection(COLLECTIONS.suscripciones).doc(id), {
      status: "inactive",
      endReason: "expired",
      endedAt,
    });
    writes += 1;
  }
  if (writes > 0) await batch.commit();
}
