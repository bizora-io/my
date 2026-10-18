
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { encryptAtRest, decryptAtRest, isAtRestEnabled } from "./backupAtRest.ts";

describe("backupAtRest", () => {
  const prev = process.env.BACKUP_AT_REST_KEY;
  before(() => {
    process.env.BACKUP_AT_REST_KEY = "test-secret-for-unit-tests-only";
  });
  after(() => {
    if (prev === undefined) delete process.env.BACKUP_AT_REST_KEY;
    else process.env.BACKUP_AT_REST_KEY = prev;
  });
  it("roundtrips", () => {
    assert.equal(isAtRestEnabled(), true);
    const { stored, encrypted } = encryptAtRest(JSON.stringify({ a: 1, hello: "বাংলা" }));
    assert.equal(encrypted, true);
    assert.match(stored, /^bizora-b64:/);
    const plain = decryptAtRest(stored);
    assert.equal(JSON.parse(plain).hello, "বাংলা");
  });
  it("passthrough without prefix", () => {
    assert.equal(decryptAtRest('{"x":1}'), '{"x":1}');
  });
});
