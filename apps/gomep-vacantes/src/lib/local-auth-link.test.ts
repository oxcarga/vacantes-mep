import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authCompleteHref,
  isLocalAuthDev,
  latestOobCode,
  resolveLocalAuthLink,
  type OobCodeRow,
} from "./local-auth-link";

const codes: OobCodeRow[] = [
  { email: "ana@example.com", oobCode: "viejo", requestType: "VERIFY_EMAIL" },
  { email: "otro@example.com", oobCode: "ajeno", requestType: "VERIFY_EMAIL" },
  { email: "ana@example.com", oobCode: "entrar", requestType: "EMAIL_SIGNIN" },
  { email: "ana@example.com", oobCode: "nuevo", requestType: "VERIFY_EMAIL" },
];

describe("isLocalAuthDev", () => {
  it("is local only for the emulator flag on a loopback host", () => {
    assert.equal(
      isLocalAuthDev({ useEmulators: true, hostname: "localhost" }),
      true,
    );
    assert.equal(
      isLocalAuthDev({ useEmulators: true, hostname: "127.0.0.1" }),
      true,
    );
    assert.equal(
      isLocalAuthDev({ useEmulators: false, hostname: "localhost" }),
      false,
    );
    assert.equal(
      isLocalAuthDev({ useEmulators: true, hostname: "vacantes.web.app" }),
      false,
    );
  });
});

describe("authCompleteHref", () => {
  it("builds the verify and sign-in continue URLs", () => {
    assert.equal(
      authCompleteHref("http://localhost:3000", "verifyEmail", "abc"),
      "http://localhost:3000/auth/complete?mode=verifyEmail&oobCode=abc",
    );
    assert.equal(
      authCompleteHref("http://127.0.0.1:3100", "signIn", "xyz", "fake-api-key"),
      "http://127.0.0.1:3100/auth/complete?mode=signIn&oobCode=xyz&apiKey=fake-api-key",
    );
  });
});

describe("latestOobCode", () => {
  it("keeps the latest code for that email and request type", () => {
    assert.equal(
      latestOobCode(codes, "ana@example.com", "VERIFY_EMAIL")?.oobCode,
      "nuevo",
    );
    assert.equal(
      latestOobCode(codes, "ana@example.com", "EMAIL_SIGNIN")?.oobCode,
      "entrar",
    );
    assert.equal(latestOobCode(codes, "nadie@example.com", "VERIFY_EMAIL"), null);
    assert.equal(
      latestOobCode(
        [{ email: "ana@example.com", requestType: "VERIFY_EMAIL" }],
        "ana@example.com",
        "VERIFY_EMAIL",
      ),
      null,
    );
  });
});

describe("resolveLocalAuthLink", () => {
  it("does not load codes when emulators are off or the origin is not loopback", async () => {
    let calls = 0;
    const loadCodes = async () => {
      calls += 1;
      return codes;
    };
    assert.equal(
      await resolveLocalAuthLink({
        useEmulators: false,
        email: "ana@example.com",
        requestType: "VERIFY_EMAIL",
        origin: "http://localhost:3000",
        loadCodes,
      }),
      null,
    );
    assert.equal(
      await resolveLocalAuthLink({
        useEmulators: true,
        email: "ana@example.com",
        requestType: "VERIFY_EMAIL",
        origin: "https://vacantes.web.app",
        loadCodes,
      }),
      null,
    );
    assert.equal(calls, 0);
  });

  it("returns null when nothing matches and the href of the latest match otherwise", async () => {
    assert.equal(
      await resolveLocalAuthLink({
        useEmulators: true,
        email: "nadie@example.com",
        requestType: "EMAIL_SIGNIN",
        origin: "http://127.0.0.1:3100",
        loadCodes: async () => codes,
      }),
      null,
    );
    assert.deepEqual(
      await resolveLocalAuthLink({
        useEmulators: true,
        email: "ana@example.com",
        requestType: "VERIFY_EMAIL",
        origin: "http://localhost:3000",
        loadCodes: async () => codes,
      }),
      {
        href: "http://localhost:3000/auth/complete?mode=verifyEmail&oobCode=nuevo",
      },
    );
    assert.equal(
      await resolveLocalAuthLink({
        useEmulators: true,
        email: "ana@example.com",
        requestType: "EMAIL_SIGNIN",
        origin: "http://127.0.0.1:3100",
        loadCodes: async () => codes,
      }),
      null,
    );
    assert.deepEqual(
      await resolveLocalAuthLink({
        useEmulators: true,
        email: "ana@example.com",
        requestType: "EMAIL_SIGNIN",
        origin: "http://127.0.0.1:3100",
        apiKey: "fake-api-key",
        loadCodes: async () => codes,
      }),
      {
        href: "http://127.0.0.1:3100/auth/complete?mode=signIn&oobCode=entrar&apiKey=fake-api-key",
      },
    );
  });
});
