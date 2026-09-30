import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendMail } from "../src/mail/resend.js";
import {
  calendarDaysUntil,
  dispatchCommitMail,
  reminderPlan,
} from "../src/notify/mail-logic.js";

describe("sendMail", () => {
  it("calls Resend when credentials exist", async () => {
    const calls = [];
    const result = await sendMail(
      { to: "a@b.c", subject: "Hola", text: "cuerpo" },
      { RESEND_API_KEY: "re_test", MAIL_FROM: "GoMEP <alerts@example.com>" },
      async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 200, text: async () => "" };
      },
    );
    assert.equal(result.skipped, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.from, "GoMEP <alerts@example.com>");
    assert.deepEqual(body.to, ["a@b.c"]);
  });

  it("logs and does not throw when credentials are missing", async () => {
    const result = await sendMail(
      { to: "a@b.c", subject: "Hola", text: "cuerpo" },
      {},
      async () => {
        throw new Error("should not fetch");
      },
    );
    assert.equal(result.skipped, true);
  });
});

describe("vacancy and reminder mail", () => {
  const vacancy = {
    Vacante: "1001",
    Especialidad: "Español",
    Institución: "Liceo Pérez Zeledón",
    Regional: "Regional Educación Perez Zeledon",
    Aplicar: "https://apps.mep.go.cr/aplicar/1001",
    regionalValue: "57",
  };

  it("emails each matching active subscriber for added vacancies only", async () => {
    const sent = [];
    const now = new Date("2026-01-10T18:00:00.000Z");
    const result = await dispatchCommitMail({
      added: [vacancy],
      subscriptions: [
        {
          id: "s1",
          uid: "u1",
          regionalValue: "57",
          especialidad: "Español",
          status: "active",
          expiresAt: "2026-02-01T00:00:00.000Z",
          reminders: {},
        },
        {
          id: "s2",
          uid: "u2",
          regionalValue: "57",
          especialidad: "Español",
          status: "inactive",
          expiresAt: "2026-02-01T00:00:00.000Z",
          reminders: {},
        },
      ],
      usersByUid: {
        u1: { email: "ana@example.com" },
        u2: { email: "luis@example.com" },
      },
      now,
      sendMail: async (payload) => sent.push(payload),
    });
    const vacancyMails = result.sent.filter((item) => item.kind === "vacante");
    assert.equal(vacancyMails.length, 1);
    assert.equal(sent[0].to, "ana@example.com");
    assert.match(sent[0].text, /1001/);
    assert.match(sent[0].text, /Español/);
    assert.match(sent[0].text, /Regional Educación Perez Zeledon/);
    assert.match(sent[0].text, /Liceo Pérez Zeledón/);
    assert.match(sent[0].text, /https:\/\/apps.mep.go.cr\/aplicar\/1001/);
  });

  it("does not email for edits, closures, or inactive subscriptions", async () => {
    const sent = [];
    const now = new Date("2026-01-10T18:00:00.000Z");
    const result = await dispatchCommitMail({
      added: [],
      subscriptions: [
        {
          id: "s1",
          uid: "u1",
          regionalValue: "57",
          especialidad: "Español",
          status: "active",
          expiresAt: "2026-02-01T00:00:00.000Z",
          reminders: { 7: "sent", 3: "sent", 2: "sent", 0: "sent" },
        },
      ],
      usersByUid: { u1: { email: "ana@example.com" } },
      now,
      sendMail: async (payload) => sent.push(payload),
    });
    assert.equal(result.sent.filter((item) => item.kind === "vacante").length, 0);
    assert.equal(sent.length, 0);
  });

  it("uses Costa Rica calendar days for reminder windows", () => {
    const expiresAt = "2026-02-01T06:00:00.000Z";
    const sevenOut = new Date("2026-01-25T18:00:00.000Z");
    assert.equal(calendarDaysUntil(expiresAt, sevenOut), 7);
    const plan = reminderPlan(
      {
        status: "active",
        expiresAt,
        reminders: {},
      },
      sevenOut,
    );
    assert.equal(plan.send, 7);
    assert.deepEqual(plan.skip, []);
  });

  it("sends only the most urgent due window and skips earlier missed ones", () => {
    const plan = reminderPlan(
      {
        status: "active",
        expiresAt: "2026-02-01T06:00:00.000Z",
        reminders: {},
      },
      new Date("2026-01-30T18:00:00.000Z"),
    );
    assert.equal(plan.send, 2);
    assert.deepEqual(plan.skip.sort((a, b) => b - a), [7, 3]);
  });

  it("does not remind a removed subscription", async () => {
    const sent = [];
    await dispatchCommitMail({
      added: [vacancy],
      subscriptions: [
        {
          id: "s1",
          uid: "u1",
          regionalValue: "57",
          especialidad: "Español",
          status: "inactive",
          endReason: "removed",
          expiresAt: "2026-02-01T00:00:00.000Z",
          reminders: {},
        },
      ],
      usersByUid: { u1: { email: "ana@example.com" } },
      now: new Date("2026-01-30T18:00:00.000Z"),
      sendMail: async (payload) => sent.push(payload),
    });
    assert.equal(sent.length, 0);
  });

  it("marks overdue active rows as expired after the day-0 reminder", async () => {
    const sent = [];
    const now = new Date("2026-02-01T18:00:00.000Z");
    const result = await dispatchCommitMail({
      added: [vacancy],
      subscriptions: [
        {
          id: "s1",
          uid: "u1",
          regionalValue: "57",
          especialidad: "Español",
          status: "active",
          expiresAt: "2026-02-01T12:00:00.000Z",
          reminders: {},
        },
      ],
      usersByUid: { u1: { email: "ana@example.com" } },
      now,
      sendMail: async (payload) => sent.push(payload),
    });
    assert.equal(result.sent.filter((item) => item.kind === "vacante").length, 0);
    assert.equal(result.sent.filter((item) => item.kind === "recordatorio").length, 1);
    assert.equal(result.sent[0].window, 0);
    assert.deepEqual(result.expiredIds, ["s1"]);
  });
});
