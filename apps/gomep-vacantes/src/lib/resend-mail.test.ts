import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendResendMail } from "./resend-mail";

describe("sendResendMail", () => {
  it("calls Resend when credentials exist", async () => {
    const calls: { url: string; body: string }[] = [];
    const result = await sendResendMail(
      { to: "a@b.c", subject: "Hola", text: "cuerpo" },
      { RESEND_API_KEY: "re_test", MAIL_FROM: "GoMEP <alerts@example.com>" },
      async (url, init) => {
        calls.push({ url, body: init.body });
        return { ok: true, status: 200, text: async () => "" };
      },
    );
    assert.deepEqual(result, { skipped: false, ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://api.resend.com/emails");
    const body = JSON.parse(calls[0]?.body ?? "{}") as {
      from: string;
      to: string[];
      subject: string;
      text: string;
    };
    assert.equal(body.from, "GoMEP <alerts@example.com>");
    assert.deepEqual(body.to, ["a@b.c"]);
    assert.equal(body.subject, "Hola");
    assert.equal(body.text, "cuerpo");
  });

  it("returns a failed result when Resend rejects the message", async () => {
    const result = await sendResendMail(
      { to: "a@b.c", subject: "Hola", text: "cuerpo" },
      { RESEND_API_KEY: "re_test", MAIL_FROM: "GoMEP <alerts@example.com>" },
      async () => ({ ok: false, status: 422, text: async () => "no" }),
    );
    assert.deepEqual(result, { skipped: false, ok: false });
  });

  it("skips the request when credentials are missing", async () => {
    const result = await sendResendMail(
      { to: "a@b.c", subject: "Hola", text: "cuerpo" },
      {},
      async () => {
        throw new Error("should not fetch");
      },
    );
    assert.deepEqual(result, { skipped: true });
  });
});
