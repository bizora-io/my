
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
  rateLimitKey,
} from "./loginRateLimit.ts";

describe("loginRateLimit", () => {
  it("locks after max failures", () => {
    const key = rateLimitKey("1.2.3.4", "test-user-" + Date.now());
    clearLoginFailures(key);
    let last = checkLoginRateLimit(key);
    assert.equal(last.allowed, true);
    for (let i = 0; i < 20; i++) {
      last = recordLoginFailure(key);
    }
    assert.equal(last.allowed, false);
    assert.ok((last.retryAfterSec || 0) > 0);
    clearLoginFailures(key);
    assert.equal(checkLoginRateLimit(key).allowed, true);
  });
});
