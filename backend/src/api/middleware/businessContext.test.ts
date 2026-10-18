import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getActingBusinessId } from "./auth.js";

function req(user: any) {
  return { user } as any;
}

describe("getActingBusinessId", () => {
  it("returns shop owner id", () => {
    assert.equal(getActingBusinessId(req({ id: "biz1", role: "SHOP_OWNER" })), "biz1");
  });
  it("returns employee businessId", () => {
    assert.equal(getActingBusinessId(req({ id: "emp1", role: "EMPLOYEE", businessId: "biz2" })), "biz2");
  });
  it("returns null for SaaS owner (must not use saas-owner as tenant path)", () => {
    assert.equal(getActingBusinessId(req({ id: "saas-owner", role: "SAAS_OWNER" })), null);
  });
  it("returns null for SaaS admin", () => {
    assert.equal(getActingBusinessId(req({ id: "adm1", role: "SAAS_ADMIN" })), null);
  });
  it("impersonated uses id as business", () => {
    assert.equal(getActingBusinessId(req({ id: "biz9", role: "SAAS_OWNER", impersonated: true })), "biz9");
  });
});
