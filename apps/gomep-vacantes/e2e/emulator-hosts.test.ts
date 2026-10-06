import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertEmulatorPortsIsolated } from "./emulator-hosts";

describe("emuladores e2e", () => {
  it("rechaza compartir el puerto de Firestore o de Auth con desarrollo", () => {
    assert.throws(
      () =>
        assertEmulatorPortsIsolated(
          { auth: 9199, firestore: 8080 },
          { auth: 9099, firestore: 8080 },
        ),
      /firestore 8080/,
    );
    assert.throws(
      () =>
        assertEmulatorPortsIsolated(
          { auth: 9099, firestore: 8180 },
          { auth: 9099, firestore: 8080 },
        ),
      /auth 9099/,
    );
  });

  it("acepta puertos distintos", () => {
    assert.doesNotThrow(() =>
      assertEmulatorPortsIsolated(
        { auth: 9199, firestore: 8180 },
        { auth: 9099, firestore: 8080 },
      ),
    );
  });
});
