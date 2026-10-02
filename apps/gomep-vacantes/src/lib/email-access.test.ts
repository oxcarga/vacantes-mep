import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyEmailAccount,
  decideEmailAccess,
  EMAIL_ACCESS_COPY,
  localVerifyHref,
} from "./email-access";

describe("classifyEmailAccount", () => {
  it("marks a missing account, an unverified account, and a verified account", () => {
    assert.equal(classifyEmailAccount(null), "missing");
    assert.equal(classifyEmailAccount({ emailVerified: false }), "verify");
    assert.equal(classifyEmailAccount({ emailVerified: true }), "magic");
  });
});

describe("decideEmailAccess", () => {
  const origin = "http://127.0.0.1:3100";
  const firebaseLink =
    "https://demo.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=abc123&apiKey=fake";

  function authFor(account: { emailVerified: boolean } | "missing") {
    const calls: string[] = [];
    return {
      calls,
      auth: {
        async getUserByEmail() {
          calls.push("get");
          if (account === "missing") {
            throw Object.assign(new Error("missing"), { code: "auth/user-not-found" });
          }
          return account;
        },
        async generateEmailVerificationLink() {
          calls.push("generate");
          return firebaseLink;
        },
      },
    };
  }

  it("returns missing without generating a link", async () => {
    const { auth, calls } = authFor("missing");
    const sent: string[] = [];
    const result = await decideEmailAccess({
      email: " Nadie@Example.com ",
      origin,
      local: false,
      auth,
      sendMail: async () => {
        sent.push("mail");
        return { ok: true };
      },
    });
    assert.deepEqual(result, { kind: "missing" });
    assert.deepEqual(calls, ["get"]);
    assert.deepEqual(sent, []);
  });

  it("returns magic for a verified account without generating a link", async () => {
    const { auth, calls } = authFor({ emailVerified: true });
    const result = await decideEmailAccess({
      email: "ana@example.com",
      origin,
      local: false,
      auth,
      sendMail: async () => {
        throw new Error("should not send");
      },
    });
    assert.deepEqual(result, { kind: "magic" });
    assert.deepEqual(calls, ["get"]);
  });

  it("sends the verification link outside local and hides the Firebase URL", async () => {
    const { auth } = authFor({ emailVerified: false });
    const bodies: string[] = [];
    const result = await decideEmailAccess({
      email: "ana@example.com",
      origin,
      local: false,
      auth,
      sendMail: async (payload) => {
        bodies.push(payload.text);
        return { ok: true };
      },
    });
    assert.deepEqual(result, { kind: "verify" });
    assert.equal(JSON.stringify(result).includes("firebaseapp.com"), false);
    assert.equal(bodies[0]?.includes(firebaseLink), true);
    assert.equal(bodies[0]?.includes("/?verificado=1"), false);
  });

  it("returns a local continue href and does not send mail", async () => {
    const { auth } = authFor({ emailVerified: false });
    const result = await decideEmailAccess({
      email: "ana@example.com",
      origin,
      local: true,
      auth,
      sendMail: async () => {
        throw new Error("should not send");
      },
    });
    assert.equal(result.kind, "verify");
    if (result.kind !== "verify") return;
    assert.equal(result.href, localVerifyHref(firebaseLink, origin));
    assert.equal(result.href?.includes("firebaseapp.com"), false);
    assert.match(result.href ?? "", /mode=verifyEmail/);
    assert.match(result.href ?? "", /oobCode=abc123/);
  });

  it("returns an error when sending the verification link fails", async () => {
    const { auth } = authFor({ emailVerified: false });
    const result = await decideEmailAccess({
      email: "ana@example.com",
      origin,
      local: false,
      auth,
      sendMail: async () => ({ ok: false }),
    });
    assert.deepEqual(result, {
      kind: "error",
      message: EMAIL_ACCESS_COPY.sendError,
    });
    assert.equal(JSON.stringify(result).includes(firebaseLink), false);
  });
});
