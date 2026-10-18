import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { processAssistantQuery } from "./assistantService.js";
import { ERP_CAPABILITY_REGISTRY } from "./capabilityRegistry.js";

describe("Bizora ERP Assistant — Capability Registry", () => {
  it("registers essential ERP modules and capabilities", () => {
    const modules = new Set(ERP_CAPABILITY_REGISTRY.map((c) => c.module));
    assert.ok(modules.has("pos"), "POS module must be registered");
    assert.ok(modules.has("inventory"), "Inventory module must be registered");
    assert.ok(modules.has("customers"), "Customers module must be registered");
    assert.ok(modules.has("purchases"), "Purchases module must be registered");
    assert.ok(modules.has("finance"), "Finance module must be registered");
    assert.ok(modules.has("subscription"), "Subscription module must be registered");
    assert.ok(modules.has("hr"), "HR module must be registered");
  });

  it("provides bilingual keywords for all core capabilities", () => {
    for (const cap of ERP_CAPABILITY_REGISTRY) {
      assert.ok(cap.keywordsEn.length > 0, `${cap.id} must have English keywords`);
      assert.ok(cap.keywordsBn.length > 0, `${cap.id} must have Bengali keywords`);
    }
  });
});

describe("Bizora ERP Assistant — Natural Language Intent Matching", () => {
  const shopOwner = {
    id: "shop_alpha",
    role: "SHOP_OWNER",
    permissions: ["all"],
    businessId: "shop_alpha",
    name: "Alpha Merchant",
  };

  it("handles Bengali queries accurately", async () => {
    // Today's sales query in Bengali
    const salesRes = await processAssistantQuery({
      message: "আজকের বিক্রয় কত?",
      user: shopOwner,
      businessId: "shop_alpha",
    });
    assert.equal(salesRes.intent, "sales_live_summary");
    assert.equal(salesRes.category, "pos");
    assert.ok(salesRes.text.includes("আজকের বিক্রয়"), "Must answer in Bengali");

    // Low stock query in Bengali
    const stockRes = await processAssistantQuery({
      message: "কোন পণ্যের স্টক কম?",
      user: shopOwner,
      businessId: "shop_alpha",
    });
    assert.equal(stockRes.intent, "inventory_low_stock");
    assert.equal(stockRes.category, "inventory");

    // Customer dues query in Bengali
    const dueRes = await processAssistantQuery({
      message: "কোন customer-এর কত বকেয়া?",
      user: shopOwner,
      businessId: "shop_alpha",
    });
    assert.equal(dueRes.intent, "customer_dues_receivables");
    assert.equal(dueRes.category, "customers");

    // Quotation to invoice workflow in Bengali
    const quoteRes = await processAssistantQuery({
      message: "Quotation থেকে invoice কীভাবে তৈরি করব?",
      user: shopOwner,
      businessId: "shop_alpha",
    });
    assert.equal(quoteRes.intent, "quotation_to_invoice_workflow");
    assert.equal(quoteRes.source, "erp_guide");
    assert.ok(quoteRes.text.includes("কোটেশন"), "Must return Bengali workflow step");
  });

  it("handles English queries accurately", async () => {
    // English sales query
    const salesRes = await processAssistantQuery({
      message: "What are today's sales?",
      user: shopOwner,
      businessId: "shop_alpha",
    });
    assert.equal(salesRes.intent, "sales_live_summary");
    assert.ok(salesRes.text.includes("Live Sales Summary"));

    // English low stock query
    const stockRes = await processAssistantQuery({
      message: "Which products are low on stock?",
      user: shopOwner,
      businessId: "shop_alpha",
    });
    assert.equal(stockRes.intent, "inventory_low_stock");

    // English supplier payables query
    const payRes = await processAssistantQuery({
      message: "Show supplier payables summary",
      user: shopOwner,
      businessId: "shop_alpha",
    });
    assert.equal(payRes.intent, "supplier_payables");

    // English sales return workflow
    const returnRes = await processAssistantQuery({
      message: "How to process a sales return?",
      user: shopOwner,
      businessId: "shop_alpha",
    });
    assert.equal(returnRes.intent, "sales_return_workflow");
    assert.equal(returnRes.source, "erp_guide");
  });
});

describe("Bizora ERP Assistant — RBAC & Tenant Permission Enforcement", () => {
  it("denies access when employee lacks required permission", async () => {
    const restrictedEmployee = {
      id: "emp_101",
      role: "EMPLOYEE",
      permissions: ["pos.sell"], // lacks pos.view_sales
      businessId: "shop_alpha",
    };

    const res = await processAssistantQuery({
      message: "আজকের বিক্রয় কত?",
      user: restrictedEmployee,
      businessId: "shop_alpha",
    });

    assert.equal(res.source, "access_denied");
    assert.match(res.text, /পারমিশন প্রয়োজন|Access Denied/);
  });

  it("grants access when employee has required permission", async () => {
    const permittedEmployee = {
      id: "emp_102",
      role: "EMPLOYEE",
      permissions: ["pos.view_sales", "pos.sell"],
      businessId: "shop_alpha",
    };

    const res = await processAssistantQuery({
      message: "What are today's sales?",
      user: permittedEmployee,
      businessId: "shop_alpha",
    });

    assert.equal(res.source, "live_database");
    assert.equal(res.intent, "sales_live_summary");
  });

  it("blocks unauthenticated callers from live database queries but allows workflow help", async () => {
    // Live database query without user or business context
    const liveRes = await processAssistantQuery({
      message: "আজকের বিক্রয় কত?",
    });
    assert.equal(liveRes.source, "access_denied");

    // General ERP workflow query without user context
    const guideRes = await processAssistantQuery({
      message: "How to process a sales return?",
    });
    assert.equal(guideRes.source, "erp_guide");
    assert.equal(guideRes.intent, "sales_return_workflow");
  });
});

