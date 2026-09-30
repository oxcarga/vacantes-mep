export const COSTA_RICA_TZ = "America/Costa_Rica";
export const REMINDER_WINDOWS = [7, 3, 2, 0];

function ymdInZone(date, timeZone = COSTA_RICA_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function utcFromYmd(ymd) {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * Calendar days from `now` until `expiresAt` in America/Costa_Rica.
 * @param {string | Date} expiresAt
 * @param {Date} now
 * @param {string} [timeZone]
 * @returns {number}
 */
export function calendarDaysUntil(expiresAt, now, timeZone = COSTA_RICA_TZ) {
  const start = utcFromYmd(ymdInZone(now, timeZone));
  const end = utcFromYmd(ymdInZone(new Date(expiresAt), timeZone));
  return Math.round((end - start) / 86_400_000);
}

export function isActiveUnexpired(subscription, now) {
  if (subscription.status !== "active") return false;
  return Date.parse(subscription.expiresAt) > now.getTime();
}

/**
 * @param {object} subscription
 * @param {Date} now
 * @returns {{ send: number | null, skip: number[] }}
 */
export function reminderPlan(subscription, now) {
  if (subscription.status !== "active") {
    return { send: null, skip: [] };
  }
  if (subscription.endReason === "removed") {
    return { send: null, skip: [] };
  }

  const reminders = subscription.reminders ?? {};
  const isOpen = (window) => {
    const state = reminders[String(window)];
    return state !== "sent" && state !== "skipped";
  };

  const days = calendarDaysUntil(subscription.expiresAt, now);
  if (days < 0) {
    return {
      send: null,
      skip: REMINDER_WINDOWS.filter(isOpen),
    };
  }

  const due = REMINDER_WINDOWS.filter((window) => days <= window && isOpen(window));
  if (due.length === 0) return { send: null, skip: [] };
  const send = Math.min(...due);
  return { send, skip: due.filter((window) => window !== send) };
}

export function vacancyEmail(vacancy, regionalLabel) {
  const numero = String(vacancy.Vacante ?? "").trim();
  const especialidad = String(vacancy.Especialidad ?? "").trim();
  const institucion = String(vacancy.Institución ?? "").trim();
  const aplicar = String(vacancy.Aplicar ?? "").trim();
  const regional = regionalLabel || String(vacancy.Regional ?? "").trim();
  const subject = `Nueva vacante ${numero} — ${especialidad}`;
  const text = [
    `Se publicó una vacante que coincide con su suscripción.`,
    ``,
    `Número: ${numero}`,
    `Especialidad: ${especialidad}`,
    `Regional: ${regional}`,
    `Institución: ${institucion}`,
    `Aplicar: ${aplicar || "(sin enlace)"}`,
  ].join("\n");
  return { subject, text, html: text.replaceAll("\n", "<br>") };
}

export function reminderEmail(subscription, appUrl) {
  const days = subscription._days;
  const subject =
    days === 0
      ? "Su suscripción vence hoy"
      : `Su suscripción vence en ${days} día${days === 1 ? "" : "s"}`;
  const link = `${appUrl.replace(/\/$/, "")}/suscripciones`;
  const text = [
    `Su suscripción a la regional ${subscription.regionalValue} y la especialidad ${subscription.especialidad} vence el ${subscription.expiresAt}.`,
    `Puede volver a agregar ese par aquí: ${link}`,
  ].join("\n");
  return { subject, text, html: text.replaceAll("\n", "<br>") };
}

/**
 * Pure mail dispatch used by the Firestore store and unit tests.
 *
 * @param {object} options
 * @param {object[]} options.added
 * @param {object[]} options.subscriptions
 * @param {Record<string, { email?: string }>} options.usersByUid
 * @param {Date} options.now
 * @param {(payload: { to: string, subject: string, text: string, html?: string }) => Promise<unknown>} options.sendMail
 * @param {string} [options.appUrl]
 */
export async function dispatchCommitMail({
  added,
  subscriptions,
  usersByUid,
  now,
  sendMail,
  appUrl = process.env.APP_URL || "https://gomep-vacantes.web.app",
}) {
  const sent = [];
  const reminderUpdates = [];
  const expiredIds = [];

  for (const vacancy of added) {
    const regionalValue = String(vacancy.regionalValue ?? "").trim();
    const especialidad = String(vacancy.Especialidad ?? "").trim();
    for (const sub of subscriptions) {
      if (!isActiveUnexpired(sub, now)) continue;
      if (sub.regionalValue !== regionalValue) continue;
      if (sub.especialidad !== especialidad) continue;
      const email = usersByUid[sub.uid]?.email;
      if (!email) continue;
      const body = vacancyEmail(vacancy, vacancy.Regional);
      await sendMail({ to: email, ...body });
      sent.push({ kind: "vacante", to: email, vacante: vacancy.Vacante });
    }
  }

  for (const sub of subscriptions) {
    const plan = reminderPlan(sub, now);
    const email = usersByUid[sub.uid]?.email;
    if (plan.send != null && email) {
      await sendMail({
        to: email,
        ...reminderEmail({ ...sub, _days: plan.send }, appUrl),
      });
      sent.push({ kind: "recordatorio", to: email, window: plan.send });
    }
    if (plan.send != null || plan.skip.length > 0) {
      reminderUpdates.push({
        id: sub.id,
        send: plan.send,
        skip: plan.skip,
      });
    }
    if (sub.status === "active" && Date.parse(sub.expiresAt) <= now.getTime()) {
      expiredIds.push(sub.id);
    }
  }

  return { sent, reminderUpdates, expiredIds };
}
