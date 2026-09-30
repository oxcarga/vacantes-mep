import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureUserProfileRecord } from "./account-service";
import { setUserRoleRecord } from "./role-service";
import {
  createSubscriptionRecord,
  removeSubscriptionRecord,
} from "./subscription-service";
import { LAST_ADMIN_ERROR, roleForEmail } from "./roles";

type Doc = Record<string, unknown>;

function memoryDb() {
  /** @type {Record<string, Record<string, Doc>>} */
  const data: Record<string, Record<string, Doc>> = {};

  function collection(name: string) {
    data[name] ??= {};
    return {
      doc(id: string) {
        return {
          id,
          async get() {
            const stored = data[name][id];
            return {
              id,
              exists: Boolean(stored),
              data: () => stored,
            };
          },
          async set(fields: Doc, options?: { merge?: boolean }) {
            data[name][id] = options?.merge
              ? { ...(data[name][id] ?? {}), ...fields }
              : fields;
          },
          async update(fields: Doc) {
            data[name][id] = { ...(data[name][id] ?? {}), ...fields };
          },
        };
      },
      async add(fields: Doc) {
        const id = `auto-${Object.keys(data[name]).length + 1}`;
        data[name][id] = fields;
        return { id };
      },
      where(field: string, _op: string, value: unknown) {
        const filters = [{ field, value }];
        const chain = {
          where(nextField: string, __op: string, nextValue: unknown) {
            filters.push({ field: nextField, value: nextValue });
            return chain;
          },
          limit() {
            return chain;
          },
          async get() {
            const docs = Object.entries(data[name] ?? {})
              .filter(([, row]) =>
                filters.every((filter) => row[filter.field] === filter.value),
              )
              .map(([id, row]) => ({
                id,
                data: () => row,
              }));
            return { empty: docs.length === 0, docs };
          },
        };
        return chain;
      },
    };
  }

  return { collection, _data: data };
}

function memoryAuth() {
  const claims: Record<string, Record<string, string>> = {};
  return {
    claims,
    async setCustomUserClaims(uid: string, next: Record<string, string>) {
      claims[uid] = next;
    },
  };
}

describe("roleForEmail", () => {
  it("assigns admin only to emails in ADMIN_EMAILS", () => {
    const list = "admin@example.com, other@example.com";
    assert.equal(roleForEmail("admin@example.com", list), "admin");
    assert.equal(roleForEmail("docente@example.com", list), "docente");
  });
});

describe("ensureUserProfileRecord", () => {
  it("sets admin only when the email is in the list", async () => {
    const auth = memoryAuth();
    const db = memoryDb();
    const adminEmails = "jefe@mep.go.cr";
    await ensureUserProfileRecord({
      auth: auth as never,
      db: db as never,
      decoded: {
        uid: "u1",
        email: "docente@mep.go.cr",
      } as never,
      profile: { name: "Ana", phone: "8888-1111" },
      adminEmails,
    });
    await ensureUserProfileRecord({
      auth: auth as never,
      db: db as never,
      decoded: {
        uid: "u2",
        email: "jefe@mep.go.cr",
      } as never,
      profile: { name: "Jefe", phone: "8888-0000" },
      adminEmails,
    });
    assert.equal(auth.claims.u1.role, "docente");
    assert.equal(auth.claims.u2.role, "admin");
    assert.equal(db._data.usuarios.u1.role, "docente");
    assert.equal(db._data.usuarios.u2.role, "admin");
  });
});

describe("setUserRoleRecord", () => {
  it("promotes, demotes, and refuses to drop the last admin", async () => {
    const auth = memoryAuth();
    const db = memoryDb();
    db._data.usuarios = {
      admin: { role: "admin", email: "a@x.cr" },
      teacher: { role: "docente", email: "t@x.cr" },
    };
    auth.claims.admin = { role: "admin" };

    const caller = {
      uid: "admin",
      role: "admin",
      email_verified: true,
    } as never;

    await setUserRoleRecord({
      auth: auth as never,
      db: db as never,
      caller,
      targetUid: "teacher",
      nextRole: "admin",
    });
    assert.equal(auth.claims.teacher.role, "admin");
    assert.equal(db._data.usuarios.teacher.role, "admin");

    await setUserRoleRecord({
      auth: auth as never,
      db: db as never,
      caller,
      targetUid: "teacher",
      nextRole: "docente",
    });
    assert.equal(db._data.usuarios.teacher.role, "docente");

    await assert.rejects(
      () =>
        setUserRoleRecord({
          auth: auth as never,
          db: db as never,
          caller,
          targetUid: "admin",
          nextRole: "docente",
        }),
      (error: Error) => error.message === LAST_ADMIN_ERROR,
    );
    assert.equal(db._data.usuarios.admin.role, "admin");
  });
});

describe("subscriptions", () => {
  it("creates a 30-day subscription, rejects a duplicate active pair, and opens a new row from history", async () => {
    const db = memoryDb();
    db._data.regionales = { "57": { label: "Pérez Zeledón" } };
    db._data.especialidades = { hash: { name: "Español" } };
    db._data.suscripciones = {};
    const docente = {
      uid: "u1",
      role: "docente",
      email_verified: true,
    } as never;

    const first = await createSubscriptionRecord({
      db: db as never,
      caller: docente,
      regionalValue: "57",
      especialidad: "Español",
    });
    assert.equal(first.status, "active");
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    assert.equal(
      Date.parse(first.expiresAt) - Date.parse(first.createdAt),
      thirtyDays,
    );

    await assert.rejects(
      () =>
        createSubscriptionRecord({
          db: db as never,
          caller: docente,
          regionalValue: "57",
          especialidad: "Español",
        }),
      /suscripción activa/,
    );

    await removeSubscriptionRecord({
      db: db as never,
      caller: docente,
      subscriptionId: first.id,
    });
    assert.equal(db._data.suscripciones[first.id].status, "inactive");
    assert.equal(db._data.suscripciones[first.id].endReason, "removed");

    const second = await createSubscriptionRecord({
      db: db as never,
      caller: docente,
      regionalValue: "57",
      especialidad: "Español",
    });
    assert.notEqual(second.id, first.id);
    assert.equal(second.status, "active");
    assert.equal(db._data.suscripciones[first.id].status, "inactive");
  });
});
